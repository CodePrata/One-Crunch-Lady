import type { SupabaseClient } from "@supabase/supabase-js";
import { applyPromoDiscount, type DiscountType } from "@/lib/pricing";

export interface PromoCodeRow {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  min_subtotal: number;
  max_redemptions: number | null;
  redemption_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
}

export interface PromoCheckResult {
  valid: boolean;
  error?: string;
  promo?: PromoCodeRow;
  total?: number;
  discountAmount?: number;
  discountLabel?: string;
}

/**
 * The one place a promo code is checked against a subtotal - both the
 * live cart preview (app/actions/promo.ts's validatePromoCode) and the
 * authoritative, server-side re-check in app/actions/orders.ts's
 * createOrder call this. If those two ever validated a code
 * independently, a customer could see a discount applied in the cart
 * that createOrder then rejects or computes differently - the same class
 * of bug lib/pricing.ts exists to prevent for product prices.
 *
 * Read-only: does not touch redemption_count. createOrder claims a
 * redemption slot atomically and separately, only once an order is
 * actually about to be inserted - see the comment there for why.
 *
 * `supabase` takes whichever client the caller already has (the
 * service-role client in both current callers) rather than constructing
 * its own, so this module stays free of the "server-only" transitive
 * import that lib/supabase/server.ts carries.
 */
export async function checkPromoCode(
  supabase: SupabaseClient,
  rawCode: string,
  subtotal: number
): Promise<PromoCheckResult> {
  const code = rawCode.trim();
  if (!code) {
    return { valid: false, error: "Please enter a promo code." };
  }

  const { data, error } = await supabase
    .from("promo_codes")
    .select(
      "id,code,discount_type,discount_value,min_subtotal,max_redemptions,redemption_count,starts_at,expires_at,is_active"
    )
    .eq("code", code)
    .maybeSingle();

  // Deliberately the same generic message for "no such code" and "code
  // exists but inactive/expired/etc" below - a more specific message
  // (e.g. "this code has expired" vs "no such code") would let someone
  // distinguish a wrong guess from a real-but-dead code, which is
  // exactly the enumeration signal the no-public-select RLS policy on
  // promo_codes is meant to deny.
  if (error || !data) {
    return { valid: false, error: "That promo code isn't valid." };
  }

  const promo = data as PromoCodeRow;

  if (!promo.is_active) {
    return { valid: false, error: "That promo code isn't valid." };
  }

  const now = new Date();
  if (promo.starts_at && new Date(promo.starts_at) > now) {
    return { valid: false, error: "That promo code isn't valid." };
  }
  if (promo.expires_at && new Date(promo.expires_at) < now) {
    return { valid: false, error: "That promo code isn't valid." };
  }
  if (promo.max_redemptions !== null && promo.redemption_count >= promo.max_redemptions) {
    return { valid: false, error: "That promo code isn't valid." };
  }
  if (subtotal < promo.min_subtotal) {
    return {
      valid: false,
      error: `Spend at least $${promo.min_subtotal.toFixed(2)} to use this code.`,
    };
  }

  const { total, discountAmount } = applyPromoDiscount(
    subtotal,
    promo.discount_type,
    promo.discount_value
  );

  return {
    valid: true,
    promo,
    total,
    discountAmount,
    discountLabel:
      promo.discount_type === "PERCENT"
        ? `${promo.discount_value}% OFF`
        : `$${promo.discount_value.toFixed(2)} OFF`,
  };
}
