"use server";

import { cookies } from "next/headers";
import { Resend } from "resend";
import { resendApiKey } from "@/config/server";
import {
  sendOrderReceivedEmail,
  sendOwnerAlertEmail,
  type OrderEmailData,
} from "@/lib/order-emails";
import { getEffectivePrice } from "@/lib/pricing";
import { checkPromoCode } from "@/lib/promo";
import { createClient } from "@/lib/supabase/server";
import { orderSchema, type OrderFormValues } from "@/lib/validations/order";

interface CreateOrderResult {
  success: boolean;
  orderRef?: string;
  accessToken?: string;
  error?: string;
}

type SupabaseAdminClient = ReturnType<typeof createClient>;

const LAST_SUBMISSION_COOKIE = "last_submission";

function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

function sanitizePayload(values: OrderFormValues): OrderFormValues {
  return {
    ...values,
    customerName: stripHtmlTags(values.customerName).trim(),
    customerEmail: values.customerEmail.trim(),
    customerPhone: values.customerPhone.trim(),
    idempotencyToken: values.idempotencyToken.trim(),
  };
}

function setLastSubmissionCookie(now: number) {
  cookies().set(LAST_SUBMISSION_COOKIE, String(now), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60,
  });
}

/** Gives back a promo redemption claimed for an order that never got saved. */
async function releasePromoClaim(supabase: SupabaseAdminClient, code: string) {
  const { error } = await supabase.rpc("release_promo_redemption", { p_code: code });
  if (error) {
    console.error(`[promo] failed to release a claim for code ${code}`, error);
  }
}

export async function createOrder(rawValues: OrderFormValues): Promise<CreateOrderResult> {
  const lastSubmission = cookies().get(LAST_SUBMISSION_COOKIE)?.value;
  const now = Date.now();

  if (lastSubmission && now - Number(lastSubmission) < 60_000) {
    return {
      success: false,
      error: "Please wait a moment before trying again.",
    };
  }

  const parsed = orderSchema.safeParse(sanitizePayload(rawValues));

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid order payload.",
    };
  }

  const values = parsed.data;
  const supabase = createClient();

  const selectedEntries = Object.entries(values.quantities).filter(([, quantity]) => quantity > 0);
  const selectedIds = selectedEntries.map(([productId]) => productId);
  const cooldownStartIso = new Date(now - 60_000).toISOString();

  // Independent reads, run in one round trip instead of four sequential
  // ones (audit B-9: the database is in Tokyo, so each trip is costly).
  const [existingResult, productsResult, recentByEmailResult, recentByPhoneResult] =
    await Promise.all([
      supabase
        .from("orders")
        .select("order_ref,access_token")
        .eq("idempotency_token", values.idempotencyToken)
        .maybeSingle(),
      supabase
        .from("products")
        .select("id,name,price,is_available,discount_type,discount_value")
        .in("id", selectedIds)
        .eq("is_available", true),
      supabase
        .from("orders")
        .select("id")
        .eq("customer_email", values.customerEmail)
        .gte("created_at", cooldownStartIso)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("orders")
        .select("id")
        .eq("customer_phone", values.customerPhone)
        .gte("created_at", cooldownStartIso)
        .limit(1)
        .maybeSingle(),
    ]);

  if (existingResult.error) {
    return {
      success: false,
      error: "Unable to verify existing order. Please try again.",
    };
  }

  // Same idempotency token = the same checkout retried (lost response,
  // double tap): hand back the order that already exists.
  if (existingResult.data?.order_ref) {
    setLastSubmissionCookie(now);
    return {
      success: true,
      orderRef: existingResult.data.order_ref,
      accessToken: existingResult.data.access_token,
    };
  }

  const products = productsResult.data;
  if (productsResult.error || !products || products.length === 0) {
    return {
      success: false,
      error: "No valid products selected. Please update your order.",
    };
  }

  const quantityMap = new Map(selectedEntries);
  const orderItems = products
    .map((product) => {
      const quantity = quantityMap.get(product.id) ?? 0;
      // getEffectivePrice is also what ProductCard/ProductDetail/
      // CartLineItems use to display a price - this is the one place a
      // discount is ever applied, so what the customer saw and what they
      // are charged cannot diverge.
      const { price } = getEffectivePrice({
        price: Number(product.price),
        discountType: product.discount_type,
        discountValue: product.discount_value !== null ? Number(product.discount_value) : null,
      });
      return {
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice: price,
      };
    })
    .filter((item) => item.quantity > 0);

  if (orderItems.length === 0) {
    return {
      success: false,
      error: "Please select at least one available item.",
    };
  }

  if (recentByEmailResult.error || recentByPhoneResult.error) {
    return {
      success: false,
      error: "Unable to validate recent submissions. Please try again.",
    };
  }

  if (recentByEmailResult.data || recentByPhoneResult.data) {
    return {
      success: false,
      error: "Please wait a moment before trying again.",
    };
  }

  // Rounded to cents so it matches exactly what numeric(10,2) stores - the
  // orders_total_matches_subtotal_check constraint (migration 023)
  // compares total_price against subtotal - discount_amount.
  const subtotal =
    Math.round(
      orderItems.reduce((total, item) => total + item.unitPrice * item.quantity, 0) * 100
    ) / 100;

  // Promo code: re-validated completely independently of whatever the
  // client claimed (checkPromoCode is the same helper the live cart
  // preview uses - see lib/promo.ts's doc comment for why that matters),
  // and the redemption slot is claimed atomically only once we're
  // actually about to insert this order, not back when the cart first
  // showed the discount.
  let totalPrice = subtotal;
  let discountAmount = 0;
  let appliedPromoCode: string | null = null;

  if (values.promoCode) {
    const promoCheck = await checkPromoCode(supabase, values.promoCode, subtotal);

    if (!promoCheck.valid || !promoCheck.promo) {
      return {
        success: false,
        error: promoCheck.error ?? "That promo code isn't valid.",
      };
    }

    // claim_promo_redemption returns a single public.promo_codes row (not
    // SETOF) - PostgREST hands that back as one object or null directly,
    // so no .single()/.maybeSingle() modifier is needed or appropriate
    // here the way it is for a table .select().
    const { data: claimedPromo, error: claimError } = await supabase.rpc("claim_promo_redemption", {
      promo_id: promoCheck.promo.id,
    });

    if (claimError || !claimedPromo) {
      // Someone else claimed the last slot (or it expired/deactivated)
      // between the check above and this claim - a real race, not a
      // hypothetical one, hence the atomic RPC rather than a JS
      // read-then-write.
      return {
        success: false,
        error: "That promo code just stopped being valid. Please remove it and try again.",
      };
    }

    totalPrice = promoCheck.total ?? subtotal;
    discountAmount = promoCheck.discountAmount ?? 0;
    appliedPromoCode = promoCheck.promo.code;
  }

  const { data: insertedOrder, error: insertError } = await supabase
    .from("orders")
    .insert({
      customer_name: values.customerName,
      customer_email: values.customerEmail,
      customer_phone: values.customerPhone,
      order_items: orderItems,
      subtotal,
      promo_code: appliedPromoCode,
      discount_amount: discountAmount,
      total_price: totalPrice,
      idempotency_token: values.idempotencyToken,
    })
    .select("order_ref,access_token,total_price,customer_name,customer_email")
    .single();

  if (insertError || !insertedOrder?.order_ref) {
    // The promo slot was claimed for an order that didn't get saved, so
    // give it back (audit B-3.2).
    if (appliedPromoCode) {
      await releasePromoClaim(supabase, appliedPromoCode);
    }

    // 23505 = unique violation. Two concurrent submits with the same
    // idempotency token (a double tap on a slow network) both passed the
    // lookup above; the other one won the insert. That order exists, so
    // this is a success, not an error (audit B-3.3).
    if (insertError?.code === "23505") {
      const { data: winner } = await supabase
        .from("orders")
        .select("order_ref,access_token")
        .eq("idempotency_token", values.idempotencyToken)
        .maybeSingle();

      if (winner?.order_ref) {
        setLastSubmissionCookie(now);
        return { success: true, orderRef: winner.order_ref, accessToken: winner.access_token };
      }
    }

    if (insertError) {
      console.error("[order] insert failed", insertError);
    }

    return {
      success: false,
      error: "We could not submit your order right now. Please try again.",
    };
  }

  setLastSubmissionCookie(now);

  const emailData: OrderEmailData = {
    orderRef: insertedOrder.order_ref,
    accessToken: insertedOrder.access_token,
    customerName: insertedOrder.customer_name,
    customerEmail: insertedOrder.customer_email,
    customerPhone: values.customerPhone,
    items: orderItems,
    subtotal,
    discountAmount,
    promoCode: appliedPromoCode,
    totalPrice: Number(insertedOrder.total_price),
  };

  // Both sent in parallel and independently: one failing can't stop the
  // other (it used to - the owner alert was skipped whenever the customer
  // email threw). Failures are logged inside the helpers and never fail
  // the order, which is already saved; the admin can resend the
  // customer's confirmation from the dashboard.
  const resend = new Resend(resendApiKey);
  await Promise.all([
    sendOrderReceivedEmail(resend, emailData),
    sendOwnerAlertEmail(resend, emailData),
  ]);

  return {
    success: true,
    orderRef: insertedOrder.order_ref,
    accessToken: insertedOrder.access_token,
  };
}
