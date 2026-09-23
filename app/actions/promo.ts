"use server";

import { checkPromoCode } from "@/lib/promo";
import { createClient } from "@/lib/supabase/server";

export interface ValidatePromoCodeResult {
  valid: boolean;
  error?: string;
  discountLabel?: string;
  discountAmount?: number;
  /**
   * The cart total after this discount. Returned alongside discountAmount
   * so the client never has to re-derive it (e.g. subtotal - discountAmount)
   * itself - it just displays what checkPromoCode already computed via
   * lib/pricing.ts's applyPromoDiscount, the same function createOrder
   * re-checks with at submit time.
   */
  total?: number;
}

/**
 * Public action - never throws, matches app/actions/orders.ts's and
 * app/actions/contact.ts's result-object pattern. A live-preview check
 * only: returns just { valid, discountLabel, discountAmount }, never the
 * promo_codes row itself (see the RLS comment on
 * 015_create_promo_codes.sql - codes must not be enumerable). createOrder
 * re-checks completely independently via the same lib/promo.ts helper
 * and is the actual source of truth; the subtotal passed in here is
 * display-only, exactly like prices already are.
 *
 * Deliberately NOT rate-limited with a cookie the way createOrder's
 * last_submission is. cookies().set() inside a Server Action makes
 * Next.js auto-refresh the calling route afterward (any Server Component
 * on the page could depend on that cookie) - harmless for createOrder,
 * whose only cookie-writing paths immediately navigate away, but
 * validatePromoCode is called repeatedly while the customer stays on the
 * same page mid-checkout, and that refresh was wiping their still-typed
 * name/email/phone (uncontrolled react-hook-form inputs reset on
 * remount). CheckoutForm's own short client-side cooldown between Apply
 * clicks covers casual guessing instead - the actual security boundary
 * for promo codes is createOrder's independent re-check and the
 * no-public-select RLS on promo_codes, not this preview endpoint.
 */
export async function validatePromoCode(
  code: string,
  subtotal: number
): Promise<ValidatePromoCodeResult> {
  const supabase = createClient();
  const result = await checkPromoCode(supabase, code, subtotal);

  return {
    valid: result.valid,
    error: result.error,
    discountLabel: result.discountLabel,
    discountAmount: result.discountAmount,
    total: result.total,
  };
}
