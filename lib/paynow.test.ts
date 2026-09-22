import { expect, test } from "@playwright/test";
import { buildPayNowQrPayload, crc16CcittFalse, renderPayNowQrSvg, resolvePayNowProxy } from "./paynow";

/**
 * Minimal flat TLV decoder, test-only. Lets tests assert the exact
 * sub-tag values EMVCo tag 26 encodes (proxy type, proxy value) instead
 * of loosely substring-matching the payload - a substring match would
 * still pass if the proxy type digit were wrong, which is exactly the
 * class of bug this file exists to catch (see resolvePayNowProxy).
 */
function parseTlv(input: string): Record<string, string> {
  const result: Record<string, string> = {};
  let i = 0;
  while (i < input.length) {
    const tag = input.slice(i, i + 2);
    const length = Number(input.slice(i + 2, i + 4));
    const value = input.slice(i + 4, i + 4 + length);
    result[tag] = value;
    i += 4 + length;
  }
  return result;
}

test.describe("resolvePayNowProxy", () => {
  test("detects a Singapore mobile number and normalizes to +65 form", () => {
    expect(resolvePayNowProxy("91234567")).toEqual({ type: "0", value: "+6591234567" });
    expect(resolvePayNowProxy("+6591234567")).toEqual({ type: "0", value: "+6591234567" });
    expect(resolvePayNowProxy("6591234567")).toEqual({ type: "0", value: "+6591234567" });
  });

  test("detects each official UEN format and normalizes to uppercase, unprefixed", () => {
    // Businesses (ROB): 8 digits + check letter (9 chars total)
    expect(resolvePayNowProxy("53123456a")).toEqual({ type: "2", value: "53123456A" });
    // Local companies (ROC) and others: 9 digits + check letter (10 chars total)
    expect(resolvePayNowProxy("201912345a")).toEqual({ type: "2", value: "201912345A" });
    // Other entities: T/S/R + 2-digit year + 2 letters + 4 digits + check letter
    expect(resolvePayNowProxy("t09ll1234a")).toEqual({ type: "2", value: "T09LL1234A" });
    expect(resolvePayNowProxy("S65LL1234B")).toEqual({ type: "2", value: "S65LL1234B" });
  });

  test("returns null for a string that matches neither a mobile number nor a UEN", () => {
    expect(resolvePayNowProxy("not-a-number")).toBeNull();
    expect(resolvePayNowProxy("12345")).toBeNull();
    expect(resolvePayNowProxy("")).toBeNull();
    // 10 digits, no trailing check letter - close to a UEN shape, must
    // still be rejected rather than loosely matched.
    expect(resolvePayNowProxy("1234567890")).toBeNull();
  });
});

test.describe("crc16CcittFalse", () => {
  test("matches the published CRC-16/CCITT-FALSE check value", () => {
    // Standard known-answer test vector for this exact CRC variant
    // (poly 0x1021, init 0xFFFF, no reflect, xorout 0x0000).
    expect(crc16CcittFalse("123456789")).toBe("29B1");
  });

  test("is deterministic for the same input", () => {
    expect(crc16CcittFalse("hello world")).toBe(crc16CcittFalse("hello world"));
  });

  test("differs for different input", () => {
    expect(crc16CcittFalse("hello world")).not.toBe(crc16CcittFalse("hello worlD"));
  });
});

test.describe("buildPayNowQrPayload", () => {
  const baseInput = {
    amount: 12.5,
    reference: "OCL-2609-0001",
    mobileNumber: "91234567",
  };

  test("builds a well-formed EMVCo payload for a bare 8-digit SG mobile number", () => {
    const payload = buildPayNowQrPayload(baseInput);
    expect(payload).not.toBeNull();

    const value = payload as string;
    expect(value.startsWith("000201")).toBe(true); // Payload Format Indicator
    expect(value).toContain("SG.PAYNOW");
    expect(value).toContain("+6591234567"); // normalized proxy value
    expect(value).toContain("540512.50"); // tag 54, length 5, "12.50"
    expect(value).toContain("5802SG"); // Country Code
    expect(value).toContain("OCL-2609-0001"); // bill/reference number
  });

  test("normalizes +65-prefixed and bare 65-prefixed numbers identically", () => {
    const withPlus = buildPayNowQrPayload({ ...baseInput, mobileNumber: "+6591234567" });
    const withoutPlus = buildPayNowQrPayload({ ...baseInput, mobileNumber: "6591234567" });
    const bare = buildPayNowQrPayload({ ...baseInput, mobileNumber: "91234567" });

    expect(withPlus).toBe(withoutPlus);
    expect(withoutPlus).toBe(bare);
  });

  test("tolerates spaces and dashes in the source number", () => {
    const payload = buildPayNowQrPayload({ ...baseInput, mobileNumber: "9123-4567" });
    expect(payload).not.toBeNull();
    expect(payload as string).toContain("+6591234567");
  });

  test("the trailing CRC matches a fresh computation over the rest of the payload", () => {
    const payload = buildPayNowQrPayload(baseInput) as string;
    const withoutCrc = payload.slice(0, -4);
    const trailingCrc = payload.slice(-4);
    expect(crc16CcittFalse(withoutCrc)).toBe(trailingCrc);
  });

  test("returns null for a malformed PAYNOW_NUMBER (misconfiguration guard)", () => {
    expect(buildPayNowQrPayload({ ...baseInput, mobileNumber: "not-a-number" })).toBeNull();
    expect(buildPayNowQrPayload({ ...baseInput, mobileNumber: "12345" })).toBeNull();
    expect(buildPayNowQrPayload({ ...baseInput, mobileNumber: "" })).toBeNull();
  });

  test("encodes proxy type '0' and the +65-normalized value for a mobile PAYNOW_NUMBER", () => {
    const payload = buildPayNowQrPayload(baseInput) as string;
    const proxy = parseTlv(parseTlv(payload)["26"]);
    expect(proxy["00"]).toBe("SG.PAYNOW");
    expect(proxy["01"]).toBe("0");
    expect(proxy["02"]).toBe("+6591234567");
    expect(proxy["03"]).toBe("0");
  });

  test("encodes proxy type '2' and the bare, unprefixed UEN for a UEN PAYNOW_NUMBER", () => {
    const payload = buildPayNowQrPayload({ ...baseInput, mobileNumber: "53123456a" }) as string;
    const proxy = parseTlv(parseTlv(payload)["26"]);
    expect(proxy["00"]).toBe("SG.PAYNOW");
    expect(proxy["01"]).toBe("2");
    expect(proxy["02"]).toBe("53123456A"); // uppercased, no +65 prefix
    expect(proxy["03"]).toBe("0");
  });

  test("returns a well-formed payload for each UEN format, not just the ROB shape", () => {
    const localCompany = buildPayNowQrPayload({ ...baseInput, mobileNumber: "201912345A" });
    const otherEntity = buildPayNowQrPayload({ ...baseInput, mobileNumber: "T09LL1234A" });

    expect(localCompany).not.toBeNull();
    expect(otherEntity).not.toBeNull();
    expect(parseTlv(parseTlv(localCompany as string)["26"])["02"]).toBe("201912345A");
    expect(parseTlv(parseTlv(otherEntity as string)["26"])["02"]).toBe("T09LL1234A");
  });

  test("returns null for a non-positive or non-finite amount", () => {
    expect(buildPayNowQrPayload({ ...baseInput, amount: 0 })).toBeNull();
    expect(buildPayNowQrPayload({ ...baseInput, amount: -5 })).toBeNull();
    expect(buildPayNowQrPayload({ ...baseInput, amount: NaN })).toBeNull();
  });
});

test.describe("renderPayNowQrSvg", () => {
  test("renders SVG markup for a valid payload", async () => {
    const payload = buildPayNowQrPayload({
      amount: 5.9,
      reference: "OCL-2609-0002",
      mobileNumber: "91234567",
    }) as string;

    const svg = await renderPayNowQrSvg(payload);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("</svg>");
  });
});
