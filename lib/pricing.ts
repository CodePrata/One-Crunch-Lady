export type DiscountType = "PERCENT" | "FIXED";

export interface DiscountableProduct {
  price: number;
  discountType: DiscountType | null;
  discountValue: number | null;
}

export interface EffectivePrice {
  /** The price actually charged and displayed as the "now" price. */
  price: number;
  /** The pre-discount price, or null when there is no active discount. */
  originalPrice: number | null;
  /** Short display label, e.g. "20% OFF" or "$2.00 OFF", or null. */
  discountLabel: string | null;
}

/**
 * The ONLY place a discount is applied to a product's price. Both the
 * storefront display (ProductCard, ProductDetail, CartLineItems) and the
 * server-side order re-pricing in app/actions/orders.ts call this - if
 * those two ever computed a discount independently, a customer could be
 * quoted one price and charged another.
 *
 * Computes in integer cents and converts back to a plain number only at
 * the end, to avoid float drift (see the existing caveat in
 * app/actions/orders.ts: 5.90 * 3 === 17.700000000000003). A percentage
 * discount applied on top of that kind of value would make the drift
 * worse, not better, if done in floating point throughout.
 */
export function getEffectivePrice(product: DiscountableProduct): EffectivePrice {
  if (!product.discountType || product.discountValue === null) {
    return { price: product.price, originalPrice: null, discountLabel: null };
  }

  const priceCents = Math.round(product.price * 100);

  if (product.discountType === "PERCENT") {
    const discountedCents = Math.round(priceCents * (1 - product.discountValue / 100));
    return {
      price: centsToAmount(discountedCents),
      originalPrice: product.price,
      discountLabel: `${formatPercent(product.discountValue)}% OFF`,
    };
  }

  // FIXED. The DB check constraint (012_add_product_discounts.sql)
  // guarantees discount_value < price, so this can't actually go
  // negative - Math.max(0, ...) is a defensive floor only, in case a
  // stale cached read (unstable_cache, 60s window) briefly disagrees
  // with a price change that landed between reads.
  const discountValueCents = Math.round(product.discountValue * 100);
  const discountedCents = Math.max(0, priceCents - discountValueCents);
  return {
    price: centsToAmount(discountedCents),
    originalPrice: product.price,
    discountLabel: `$${product.discountValue.toFixed(2)} OFF`,
  };
}

function centsToAmount(cents: number): number {
  return Math.round(cents) / 100;
}

// "20% OFF" rather than "20.0% OFF", but keeps one decimal for a
// non-integer percentage like 12.5.
function formatPercent(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
