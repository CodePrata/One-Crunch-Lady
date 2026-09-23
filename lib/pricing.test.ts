import { expect, test } from "@playwright/test";
import { getEffectivePrice } from "./pricing";

test.describe("getEffectivePrice", () => {
  test("returns the plain price unchanged when there is no discount", () => {
    const result = getEffectivePrice({ price: 5.9, discountType: null, discountValue: null });
    expect(result).toEqual({ price: 5.9, originalPrice: null, discountLabel: null });
  });

  test("applies a whole-number percentage discount", () => {
    const result = getEffectivePrice({ price: 10, discountType: "PERCENT", discountValue: 20 });
    expect(result.price).toBe(8);
    expect(result.originalPrice).toBe(10);
    expect(result.discountLabel).toBe("20% OFF");
  });

  test("applies a fractional percentage discount and keeps one decimal in the label", () => {
    const result = getEffectivePrice({ price: 10, discountType: "PERCENT", discountValue: 12.5 });
    expect(result.price).toBe(8.75);
    expect(result.discountLabel).toBe("12.5% OFF");
  });

  test("applies a fixed-amount discount", () => {
    const result = getEffectivePrice({ price: 5.9, discountType: "FIXED", discountValue: 2 });
    expect(result.price).toBe(3.9);
    expect(result.originalPrice).toBe(5.9);
    expect(result.discountLabel).toBe("$2.00 OFF");
  });

  test("computes in cents to avoid float drift on values that don't divide evenly", () => {
    // 5.90 * 3 famously drifts to 17.700000000000003 in plain floating
    // point (see the caveat this same comment appears against in
    // app/actions/orders.ts) - a discount computed the naive way on a
    // price like this would compound that drift. Applying a 10% discount
    // to 5.90 must land on exactly 5.31, not something like
    // 5.309999999999999.
    const result = getEffectivePrice({ price: 5.9, discountType: "PERCENT", discountValue: 10 });
    expect(result.price).toBe(5.31);
  });

  test("never returns a negative price for a fixed discount (defensive floor)", () => {
    // The DB check constraint (012_add_product_discounts.sql) guarantees
    // this can't happen for real data, but the function itself should
    // still degrade safely rather than showing a negative price.
    const result = getEffectivePrice({ price: 5, discountType: "FIXED", discountValue: 10 });
    expect(result.price).toBe(0);
  });

  test("a 100% percentage discount reduces the price to zero", () => {
    const result = getEffectivePrice({ price: 8.5, discountType: "PERCENT", discountValue: 100 });
    expect(result.price).toBe(0);
  });
});
