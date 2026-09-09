import { expect, test } from "@playwright/test";
import { buildPayNowQrPayload, crc16CcittFalse, renderPayNowQrSvg } from "./paynow";

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
