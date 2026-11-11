import { expect, test } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { signCloudinaryParams } from "./cloudinary-signature";
import { checkPromoCode, type PromoCodeRow } from "./promo";
import { verifyTurnstile } from "./turnstile";
import { toWhatsAppNumber } from "./utils";
import { MAX_DISTINCT_ITEMS, orderSchema } from "./validations/order";
import { isImageUrlFromCloud } from "./validations/product";
import { promoCodeSchema } from "./validations/promo";

// Tests for the fixes from the 2026-11 production audit that can run
// without a database, a browser or env vars.

function fakeSupabaseReturning(row: PromoCodeRow | null): SupabaseClient {
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: row, error: null }),
  };
  return { from: () => query } as unknown as SupabaseClient;
}

const basePromo: PromoCodeRow = {
  id: "00000000-0000-0000-0000-000000000001",
  code: "CRUNCH10",
  discount_type: "PERCENT",
  discount_value: 10,
  min_subtotal: 0,
  max_redemptions: null,
  redemption_count: 0,
  starts_at: null,
  expires_at: null,
  is_active: true,
};

test.describe("checkPromoCode (B-3.4 / Q-7)", () => {
  test("accepts a normal percentage code", async () => {
    const result = await checkPromoCode(fakeSupabaseReturning(basePromo), "crunch10", 20);
    expect(result.valid).toBe(true);
    expect(result.total).toBe(18);
  });

  test("rejects a FIXED code that would make the order free", async () => {
    const promo: PromoCodeRow = { ...basePromo, discount_type: "FIXED", discount_value: 5 };
    const result = await checkPromoCode(fakeSupabaseReturning(promo), "FIVEOFF", 4);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("can't be used");
  });

  test("rejects a 100% code", async () => {
    const promo: PromoCodeRow = { ...basePromo, discount_value: 100 };
    const result = await checkPromoCode(fakeSupabaseReturning(promo), "FREEBIE", 12);
    expect(result.valid).toBe(false);
  });
});

test.describe("promoCodeSchema (S-3, B-3.4)", () => {
  test("requires at least 6 characters", () => {
    const result = promoCodeSchema.safeParse({
      code: "CNY",
      discount_type: "PERCENT",
      discount_value: 10,
    });
    expect(result.success).toBe(false);
  });

  test("requires a FIXED code's minimum spend to exceed the discount", () => {
    const noMinimum = promoCodeSchema.safeParse({
      code: "FIVEOFF",
      discount_type: "FIXED",
      discount_value: 5,
    });
    expect(noMinimum.success).toBe(false);

    const withMinimum = promoCodeSchema.safeParse({
      code: "FIVEOFF",
      discount_type: "FIXED",
      discount_value: 5,
      min_subtotal: 20,
    });
    expect(withMinimum.success).toBe(true);
  });
});

test.describe("orderSchema (Q-4)", () => {
  const validOrder = {
    customerName: "Test Customer",
    customerEmail: "test@example.com",
    customerPhone: "91234567",
    paymentAcknowledged: true,
    idempotencyToken: "6f1c2b8e-3c1d-4d2a-9a7e-2d3f4b5c6d7e",
  };

  test("accepts a normal order", () => {
    const result = orderSchema.safeParse({ ...validOrder, quantities: { a: 2 } });
    expect(result.success).toBe(true);
  });

  test("rejects more than the maximum number of distinct items", () => {
    const quantities = Object.fromEntries(
      Array.from({ length: MAX_DISTINCT_ITEMS + 1 }, (_, index) => [`id-${index}`, 1])
    );
    const result = orderSchema.safeParse({ ...validOrder, quantities });
    expect(result.success).toBe(false);
  });
});

test.describe("isImageUrlFromCloud (S-7)", () => {
  test("accepts this account's images and an empty value", () => {
    expect(isImageUrlFromCloud("https://res.cloudinary.com/ocl/image/upload/a.png", "ocl")).toBe(
      true
    );
    expect(isImageUrlFromCloud("", "ocl")).toBe(true);
  });

  test("rejects another account's images and other hosts", () => {
    expect(
      isImageUrlFromCloud("https://res.cloudinary.com/someoneelse/image/upload/a.png", "ocl")
    ).toBe(false);
    expect(isImageUrlFromCloud("https://example.com/ocl/a.png", "ocl")).toBe(false);
    expect(isImageUrlFromCloud("http://res.cloudinary.com/ocl/a.png", "ocl")).toBe(false);
  });
});

test.describe("toWhatsAppNumber (B-2)", () => {
  test("normalises both stored phone formats", () => {
    expect(toWhatsAppNumber("91234567")).toBe("6591234567");
    expect(toWhatsAppNumber("+6581234567")).toBe("6581234567");
  });

  test("returns null for missing or non-Singapore numbers", () => {
    expect(toWhatsAppNumber(null)).toBeNull();
    expect(toWhatsAppNumber("61234567")).toBeNull();
  });
});

test.describe("signCloudinaryParams (S-2)", () => {
  test("matches the worked example in Cloudinary's signature docs", () => {
    const signature = signCloudinaryParams(
      {
        timestamp: 1315060510,
        public_id: "sample_image",
        eager: "w_400,h_300,c_pad|w_260,h_200,c_crop",
        file: "ignored",
        api_key: "ignored",
      },
      "abcd"
    );
    expect(signature).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e");
  });
});

test.describe("verifyTurnstile (S-1)", () => {
  function fakeFetch(response: { ok: boolean; status?: number; body?: unknown }) {
    return (async () =>
      ({
        ok: response.ok,
        status: response.status ?? 200,
        json: async () => response.body,
      }) as Response) as unknown as typeof fetch;
  }

  test("blocks a missing token without calling Cloudflare", async () => {
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return {} as Response;
    }) as unknown as typeof fetch;
    expect(await verifyTurnstile({ secret: "s", token: undefined, fetchImpl })).toBe(false);
    expect(called).toBe(false);
  });

  test("passes a token Cloudflare accepts and blocks one it rejects", async () => {
    expect(
      await verifyTurnstile({
        secret: "s",
        token: "t",
        fetchImpl: fakeFetch({ ok: true, body: { success: true } }),
      })
    ).toBe(true);
    expect(
      await verifyTurnstile({
        secret: "s",
        token: "t",
        fetchImpl: fakeFetch({
          ok: true,
          body: { success: false, "error-codes": ["invalid-input-response"] },
        }),
      })
    ).toBe(false);
  });

  test("fails open when Cloudflare itself is down", async () => {
    expect(
      await verifyTurnstile({
        secret: "s",
        token: "t",
        fetchImpl: fakeFetch({ ok: false, status: 503 }),
      })
    ).toBe(true);
  });
});
