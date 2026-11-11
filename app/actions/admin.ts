"use server";

import { render } from "@react-email/render";
import { revalidatePath, revalidateTag } from "next/cache";
import { Resend } from "resend";
import { emailFrom, ownerEmail, resendApiKey } from "@/config/server";
import { pickupHours, whatsappNumber } from "@/config/site";
import PaymentConfirmedEmail from "@/emails/PaymentConfirmedEmail";
import ReadyForPickupEmail from "@/emails/ReadyForPickupEmail";
import { adminFail, assertAdminAccess, runAdminAction } from "@/lib/admin-auth";
import { BANNERS_CACHE_TAG } from "@/lib/banners";
import { BRANDING_CACHE_TAG } from "@/lib/branding";
import { sendEmail } from "@/lib/email";
import { FAQ_CACHE_TAG } from "@/lib/faq";
import { sendOrderReceivedEmail } from "@/lib/order-emails";
import { PRODUCTS_CACHE_TAG } from "@/lib/products";
import { supabaseAdmin } from "@/lib/supabase/server";
import { bannerSchema } from "@/lib/validations/banner";
import {
  type BrandingImageInput,
  type BrandingSlot,
  brandingImageSchema,
  brandingSlotSchema,
} from "@/lib/validations/branding";
import { faqItemSchema, faqReorderSchema } from "@/lib/validations/faq";
import { productDiscountSchema, productSchema } from "@/lib/validations/product";
import { promoCodeSchema } from "@/lib/validations/promo";
import type {
  AdminBanner,
  AdminBranding,
  AdminFaqItem,
  AdminOrder,
  AdminOrderTransition,
  AdminProduct,
  AdminPromoCode,
  AdminResult,
} from "@/types/admin";

// Error convention (audit 2026-11 B-10): fetch* functions are only called
// from the admin Server Component page and still throw (the route's
// error.tsx handles them). Every mutation returns an AdminResult through
// runAdminAction instead of throwing, because Next.js hides a thrown
// action error's message in production. Inside a mutation, adminFail()
// gives the owner a friendly message and logs the raw database error.

interface CreateProductInput {
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  ingredients: string;
}

interface UpdateProductInput {
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  ingredients: string;
}

const ORDER_COLUMNS =
  "id,order_ref,customer_name,customer_email,customer_phone,order_items,subtotal,discount_amount,promo_code,total_price,status,created_at,paid_at,ready_at,closed_at";

/** How far back closed (collected/cancelled/expired) orders are listed. */
const CLOSED_ORDERS_WINDOW_DAYS = 30;

/**
 * Every open order (UNPAID/PAID/READY) regardless of age, plus orders
 * closed in the last 30 days - not the whole table on every visit
 * (audit 2026-11 B-6). Capped at 500 rows as a safety net.
 */
export async function fetchOrders(): Promise<AdminOrder[]> {
  await assertAdminAccess();
  const supabase = supabaseAdmin();

  const closedSince = new Date(
    Date.now() - CLOSED_ORDERS_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .or(`status.in.(UNPAID,PAID,READY),created_at.gte.${closedSince}`)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(`Failed to fetch orders: ${error.message}`);
  }

  return (data ?? []) as AdminOrder[];
}

export async function fetchProducts(): Promise<AdminProduct[]> {
  await assertAdminAccess();
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("products")
    .select(
      "id,name,description,price,image_url,category,ingredients,is_available,discount_type,discount_value"
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  return (data ?? []) as AdminProduct[];
}

/**
 * Moves an order to `status` through transition_order_status (migration
 * 023), which only allows UNPAID->PAID, PAID->READY, READY->COLLECTED and
 * UNPAID/PAID->CANCELLED, checked against the order's CURRENT status
 * inside the database. A double-click, a second open tab, or an invalid
 * jump gets no row back, so the customer email below is sent at most once.
 */
export async function updateOrderStatus(
  orderId: number,
  status: AdminOrderTransition
): Promise<AdminResult> {
  return runAdminAction(async () => {
    const admin = await assertAdminAccess();
    const supabase = supabaseAdmin();

    const { data: updatedOrder, error } = await supabase
      .rpc("transition_order_status", {
        p_order_id: orderId,
        p_to: status,
        p_actor: admin.id,
      })
      .maybeSingle<AdminOrder>();

    if (error) {
      adminFail("Couldn't update the order. Please try again.", error);
    }

    if (!updatedOrder) {
      adminFail("This order was already updated. Refresh to see its current status.");
    }

    revalidatePath("/admin/orders");

    // Only PAID and READY tell the customer anything.
    if ((status !== "PAID" && status !== "READY") || !updatedOrder.customer_email) {
      return;
    }

    const customerName = updatedOrder.customer_name ?? "Customer";
    const emailElement =
      status === "PAID"
        ? PaymentConfirmedEmail({ orderRef: updatedOrder.order_ref, customerName, whatsappNumber })
        : ReadyForPickupEmail({
            orderRef: updatedOrder.order_ref,
            customerName,
            pickupHours,
            whatsappNumber,
          });

    let sent = false;
    try {
      // A plain-text alternative alongside react: - an HTML/React-only
      // send costs spam-score points on its own. Rendered from the same
      // element `react:` will render, so the two can't drift apart.
      const text = await render(emailElement, { plainText: true });
      sent = await sendEmail(
        new Resend(resendApiKey),
        {
          from: emailFrom,
          to: updatedOrder.customer_email,
          // So a customer hitting Reply reaches the owner, not an
          // unmonitored orders@ sender address.
          replyTo: ownerEmail,
          subject:
            status === "PAID"
              ? `Order #${updatedOrder.order_ref}: Payment Received, We're Baking!`
              : `Order #${updatedOrder.order_ref}: Ready for Pickup!`,
          react: emailElement,
          text,
        },
        `status-${status.toLowerCase()} order=${updatedOrder.order_ref}`
      );
    } catch (renderError) {
      console.error(`[email:status order=${updatedOrder.order_ref}] rendering failed`, renderError);
    }

    // The status change itself succeeded and stays - but tell the owner
    // the email didn't go out, so she can WhatsApp the customer instead.
    if (!sent) {
      adminFail(
        `Order marked ${status}, but the email to the customer could not be sent. Please message them on WhatsApp.`
      );
    }
  });
}

/**
 * Sends the customer's "Order Received" email again (payment details plus
 * a link back to the PayNow QR) - the recovery path when the original
 * failed or the customer can't find it.
 */
export async function resendOrderConfirmation(orderId: number): Promise<AdminResult> {
  return runAdminAction(async () => {
    await assertAdminAccess();
    const supabase = supabaseAdmin();

    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "order_ref,access_token,customer_name,customer_email,customer_phone,order_items,subtotal,discount_amount,promo_code,total_price"
      )
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      adminFail("Couldn't load that order. Please try again.", error);
    }
    if (!order) {
      adminFail("Order not found.");
    }
    if (!order.customer_email) {
      adminFail("This order has no email address (it has been anonymised).");
    }

    const sent = await sendOrderReceivedEmail(new Resend(resendApiKey), {
      orderRef: order.order_ref,
      accessToken: order.access_token,
      customerName: order.customer_name ?? "Customer",
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone ?? "",
      items: order.order_items ?? [],
      subtotal: Number(order.subtotal ?? order.total_price),
      discountAmount: Number(order.discount_amount ?? 0),
      promoCode: order.promo_code,
      totalPrice: Number(order.total_price),
    });

    if (!sent) {
      adminFail("The email could not be sent. Please message the customer on WhatsApp.");
    }
  });
}

export async function toggleProductAvailability(
  productId: string,
  isAvailable: boolean
): Promise<AdminResult> {
  return runAdminAction(async () => {
    await assertAdminAccess();
    const supabase = supabaseAdmin();

    const { error } = await supabase
      .from("products")
      .update({ is_available: isAvailable })
      .eq("id", productId);

    if (error) {
      adminFail("Couldn't update the product. Please try again.", error);
    }

    revalidatePath("/admin/orders");
    revalidatePath("/");
    revalidateTag(PRODUCTS_CACHE_TAG);
  });
}

function slugifyProductName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function createProduct(data: CreateProductInput): Promise<AdminResult> {
  return runAdminAction(async () => {
    await assertAdminAccess();
    const supabase = supabaseAdmin();

    const parsed = productSchema.safeParse(data);
    if (!parsed.success) {
      adminFail(parsed.error.issues[0]?.message ?? "Please provide valid product details.");
    }

    const {
      name: cleanName,
      description: cleanDescription,
      price: cleanPrice,
      image_url: cleanImageUrl,
      ingredients: cleanIngredients,
    } = parsed.data;
    // Nullable per 008_add_category_to_products.sql - its check constraint
    // rejects an empty/whitespace string, so blank means "no category"
    // (null), not "".
    const cleanCategory = parsed.data.category || null;

    const { error } = await supabase.from("products").insert({
      name: cleanName,
      slug: slugifyProductName(cleanName),
      description: cleanDescription,
      price: cleanPrice,
      image_url: cleanImageUrl || null,
      category: cleanCategory,
      ingredients: cleanIngredients,
      is_available: true,
    });

    if (error) {
      if (error.code === "23505") {
        adminFail("A product with that name already exists.", error);
      }
      adminFail("Couldn't create the product. Please try again.", error);
    }

    revalidatePath("/admin/orders");
    revalidatePath("/");
    revalidateTag(PRODUCTS_CACHE_TAG);
  });
}

export async function updateProduct(
  productId: string,
  data: UpdateProductInput
): Promise<AdminResult> {
  return runAdminAction(async () => {
    await assertAdminAccess();
    const supabase = supabaseAdmin();

    if (!productId) {
      adminFail("Please provide valid product details.");
    }

    const parsed = productSchema.safeParse(data);
    if (!parsed.success) {
      adminFail(parsed.error.issues[0]?.message ?? "Please provide valid product details.");
    }

    const {
      name: cleanName,
      description: cleanDescription,
      price: cleanPrice,
      image_url: cleanImageUrl,
      ingredients: cleanIngredients,
    } = parsed.data;
    // Nullable per 008_add_category_to_products.sql - see createProduct.
    const cleanCategory = parsed.data.category || null;

    const { error } = await supabase
      .from("products")
      .update({
        name: cleanName,
        description: cleanDescription,
        price: cleanPrice,
        image_url: cleanImageUrl || null,
        category: cleanCategory,
        ingredients: cleanIngredients,
      })
      .eq("id", productId);

    if (error) {
      adminFail("Couldn't update the product. Please try again.", error);
    }

    revalidatePath("/admin/orders");
    revalidateTag(PRODUCTS_CACHE_TAG);
    revalidatePath("/");
  });
}

interface SetProductDiscountInput {
  discount_type: "PERCENT" | "FIXED";
  discount_value: number;
}

/**
 * `price` is never touched here - it stays the original, pre-discount
 * price (see the doc comment on 012_add_product_discounts.sql and
 * lib/pricing.ts). Setting a discount only ever writes discount_type/
 * discount_value.
 */
export async function setProductDiscount(
  productId: string,
  data: SetProductDiscountInput
): Promise<AdminResult> {
  return runAdminAction(async () => {
    await assertAdminAccess();
    const supabase = supabaseAdmin();

    const parsed = productDiscountSchema.safeParse(data);
    if (!parsed.success) {
      adminFail(parsed.error.issues[0]?.message ?? "Please provide a valid discount.");
    }

    // A FIXED discount >= price is rejected by the DB check constraint
    // regardless, but checking here first gives a clear message.
    if (parsed.data.discount_type === "FIXED") {
      const { data: product, error: fetchError } = await supabase
        .from("products")
        .select("price")
        .eq("id", productId)
        .single();

      if (fetchError || !product) {
        adminFail("Product not found.", fetchError);
      }
      if (parsed.data.discount_value >= product.price) {
        adminFail("A fixed discount must be less than the product's price.");
      }
    }

    const { error } = await supabase
      .from("products")
      .update({
        discount_type: parsed.data.discount_type,
        discount_value: parsed.data.discount_value,
      })
      .eq("id", productId);

    if (error) {
      adminFail("Couldn't set the discount. Please try again.", error);
    }

    revalidatePath("/admin/orders");
    revalidatePath("/");
    revalidateTag(PRODUCTS_CACHE_TAG);
  });
}

export async function clearProductDiscount(productId: string): Promise<AdminResult> {
  return runAdminAction(async () => {
    await assertAdminAccess();
    const supabase = supabaseAdmin();

    const { error } = await supabase
      .from("products")
      .update({ discount_type: null, discount_value: null })
      .eq("id", productId);

    if (error) {
      adminFail("Couldn't clear the discount. Please try again.", error);
    }

    revalidatePath("/admin/orders");
    revalidatePath("/");
    revalidateTag(PRODUCTS_CACHE_TAG);
  });
}

export async function fetchBanners(): Promise<AdminBanner[]> {
  await assertAdminAccess();
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("promotion_banners")
    .select("id,image_url,alt_text,sort_order,is_active,image_width,image_height")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch banners: ${error.message}`);
  }

  return (data ?? []) as AdminBanner[];
}

interface CreateBannerInput {
  image_url: string;
  alt_text: string;
  sort_order?: number;
  image_width?: number;
  image_height?: number;
}

export async function createBanner(data: CreateBannerInput): Promise<AdminResult> {
  return runAdminAction(async () => {
    await assertAdminAccess();
    const supabase = supabaseAdmin();

    const parsed = bannerSchema.safeParse(data);
    if (!parsed.success) {
      adminFail(parsed.error.issues[0]?.message ?? "Please provide valid banner details.");
    }

    const { error } = await supabase.from("promotion_banners").insert({
      image_url: parsed.data.image_url,
      alt_text: parsed.data.alt_text,
      sort_order: parsed.data.sort_order ?? 0,
      image_width: parsed.data.image_width ?? null,
      image_height: parsed.data.image_height ?? null,
      is_active: true,
    });

    if (error) {
      adminFail("Couldn't create the banner. Please try again.", error);
    }

    revalidatePath("/admin/orders");
    revalidatePath("/promotion");
    revalidateTag(BANNERS_CACHE_TAG);
  });
}

export async function toggleBannerActive(
  bannerId: string,
  isActive: boolean
): Promise<AdminResult> {
  return runAdminAction(async () => {
    await assertAdminAccess();
    const supabase = supabaseAdmin();

    const { error } = await supabase
      .from("promotion_banners")
      .update({ is_active: isActive })
      .eq("id", bannerId);

    if (error) {
      adminFail("Couldn't update the banner. Please try again.", error);
    }

    revalidatePath("/admin/orders");
    revalidatePath("/promotion");
    revalidateTag(BANNERS_CACHE_TAG);
  });
}

export async function deleteBanner(bannerId: string): Promise<AdminResult> {
  return runAdminAction(async () => {
    await assertAdminAccess();
    const supabase = supabaseAdmin();

    const { error } = await supabase.from("promotion_banners").delete().eq("id", bannerId);

    if (error) {
      adminFail("Couldn't delete the banner. Please try again.", error);
    }

    revalidatePath("/admin/orders");
    revalidatePath("/promotion");
    revalidateTag(BANNERS_CACHE_TAG);
  });
}

const EMPTY_BRANDING: AdminBranding = {
  header_mascot_url: null,
  header_mascot_width: null,
  header_mascot_height: null,
  header_wordmark_url: null,
  header_wordmark_width: null,
  header_wordmark_height: null,
};

// The header is in the root layout, so a branding change affects every
// page: revalidatePath("/", "layout") covers all routes, and the tag
// covers lib/branding.ts's cached read (which has no time-based expiry).
function revalidateBranding() {
  revalidatePath("/admin/orders");
  revalidatePath("/", "layout");
  revalidateTag(BRANDING_CACHE_TAG);
}

export async function fetchBranding(): Promise<AdminBranding> {
  await assertAdminAccess();
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("site_branding")
    .select(
      "header_mascot_url,header_mascot_width,header_mascot_height,header_wordmark_url,header_wordmark_width,header_wordmark_height"
    )
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch branding: ${error.message}`);
  }

  return (data as AdminBranding | null) ?? EMPTY_BRANDING;
}

export async function setHeaderImage(
  slot: BrandingSlot,
  data: BrandingImageInput
): Promise<AdminResult> {
  return runAdminAction(async () => {
    await assertAdminAccess();
    const supabase = supabaseAdmin();

    const parsedSlot = brandingSlotSchema.safeParse(slot);
    const parsed = brandingImageSchema.safeParse(data);
    if (!parsedSlot.success) {
      adminFail("Unknown logo slot.");
    }
    if (!parsed.success) {
      adminFail(parsed.error.issues[0]?.message ?? "Please provide a valid image.");
    }

    const prefix = `header_${parsedSlot.data}`;
    const { error } = await supabase.from("site_branding").upsert({
      id: 1,
      [`${prefix}_url`]: parsed.data.image_url,
      [`${prefix}_width`]: parsed.data.image_width,
      [`${prefix}_height`]: parsed.data.image_height,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      adminFail("Couldn't save the logo. Please try again.", error);
    }

    revalidateBranding();
  });
}

export async function resetHeaderImage(slot: BrandingSlot): Promise<AdminResult> {
  return runAdminAction(async () => {
    await assertAdminAccess();
    const supabase = supabaseAdmin();

    const parsedSlot = brandingSlotSchema.safeParse(slot);
    if (!parsedSlot.success) {
      adminFail("Unknown logo slot.");
    }

    const prefix = `header_${parsedSlot.data}`;
    const { error } = await supabase.from("site_branding").upsert({
      id: 1,
      [`${prefix}_url`]: null,
      [`${prefix}_width`]: null,
      [`${prefix}_height`]: null,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      adminFail("Couldn't reset the logo. Please try again.", error);
    }

    revalidateBranding();
  });
}

export async function fetchPromoCodes(): Promise<AdminPromoCode[]> {
  await assertAdminAccess();
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("promo_codes")
    .select(
      "id,code,discount_type,discount_value,min_subtotal,max_redemptions,redemption_count,starts_at,expires_at,is_active"
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch promo codes: ${error.message}`);
  }

  return (data ?? []) as AdminPromoCode[];
}

interface CreatePromoCodeInput {
  code: string;
  discount_type: "PERCENT" | "FIXED";
  discount_value: number;
  min_subtotal?: number;
  max_redemptions?: number;
  starts_at?: string;
  expires_at?: string;
}

export async function createPromoCode(data: CreatePromoCodeInput): Promise<AdminResult> {
  return runAdminAction(async () => {
    await assertAdminAccess();
    const supabase = supabaseAdmin();

    const parsed = promoCodeSchema.safeParse(data);
    if (!parsed.success) {
      adminFail(parsed.error.issues[0]?.message ?? "Please provide valid promo code details.");
    }

    const { error } = await supabase.from("promo_codes").insert({
      // citext makes matching case-insensitive regardless of stored
      // casing - uppercasing here is purely a consistent-looking admin
      // list, not a functional requirement.
      code: parsed.data.code.toUpperCase(),
      discount_type: parsed.data.discount_type,
      discount_value: parsed.data.discount_value,
      min_subtotal: parsed.data.min_subtotal ?? 0,
      max_redemptions: parsed.data.max_redemptions ?? null,
      starts_at: parsed.data.starts_at || null,
      expires_at: parsed.data.expires_at || null,
      is_active: true,
    });

    if (error) {
      if (error.code === "23505") {
        adminFail("That promo code already exists.");
      }
      adminFail("Couldn't create the promo code. Please try again.", error);
    }

    revalidatePath("/admin/orders");
  });
}

export async function togglePromoCodeActive(
  promoCodeId: string,
  isActive: boolean
): Promise<AdminResult> {
  return runAdminAction(async () => {
    await assertAdminAccess();
    const supabase = supabaseAdmin();

    const { error } = await supabase
      .from("promo_codes")
      .update({ is_active: isActive })
      .eq("id", promoCodeId);

    if (error) {
      adminFail("Couldn't update the promo code. Please try again.", error);
    }

    revalidatePath("/admin/orders");
  });
}

export async function deletePromoCode(promoCodeId: string): Promise<AdminResult> {
  return runAdminAction(async () => {
    await assertAdminAccess();
    const supabase = supabaseAdmin();

    const { error } = await supabase.from("promo_codes").delete().eq("id", promoCodeId);

    if (error) {
      adminFail("Couldn't delete the promo code. Please try again.", error);
    }

    revalidatePath("/admin/orders");
  });
}

interface FaqItemInput {
  question: string;
  answer: string;
}

function revalidateFaq() {
  revalidatePath("/admin/orders");
  revalidatePath("/faq");
  revalidateTag(FAQ_CACHE_TAG);
}

export async function fetchFaqItems(): Promise<AdminFaqItem[]> {
  await assertAdminAccess();
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("faq_items")
    .select("id,question,answer,sort_order,is_published")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch FAQ items: ${error.message}`);
  }

  return (data ?? []) as AdminFaqItem[];
}

export async function createFaqItem(data: FaqItemInput): Promise<AdminResult> {
  return runAdminAction(async () => {
    await assertAdminAccess();
    const supabase = supabaseAdmin();

    const parsed = faqItemSchema.safeParse(data);
    if (!parsed.success) {
      adminFail(parsed.error.issues[0]?.message ?? "Please provide a valid question and answer.");
    }

    // New questions go to the bottom of the list.
    const { data: last, error: lastError } = await supabase
      .from("faq_items")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastError) {
      adminFail("Couldn't add the question. Please try again.", lastError);
    }

    const { error } = await supabase.from("faq_items").insert({
      question: parsed.data.question,
      answer: parsed.data.answer,
      sort_order: ((last as { sort_order: number } | null)?.sort_order ?? 0) + 1,
      is_published: true,
    });

    if (error) {
      adminFail("Couldn't add the question. Please try again.", error);
    }

    revalidateFaq();
  });
}

export async function updateFaqItem(faqItemId: string, data: FaqItemInput): Promise<AdminResult> {
  return runAdminAction(async () => {
    await assertAdminAccess();
    const supabase = supabaseAdmin();

    const parsed = faqItemSchema.safeParse(data);
    if (!parsed.success) {
      adminFail(parsed.error.issues[0]?.message ?? "Please provide a valid question and answer.");
    }

    const { error } = await supabase
      .from("faq_items")
      .update({
        question: parsed.data.question,
        answer: parsed.data.answer,
        updated_at: new Date().toISOString(),
      })
      .eq("id", faqItemId);

    if (error) {
      adminFail("Couldn't update the question. Please try again.", error);
    }

    revalidateFaq();
  });
}

export async function toggleFaqItemPublished(
  faqItemId: string,
  isPublished: boolean
): Promise<AdminResult> {
  return runAdminAction(async () => {
    await assertAdminAccess();
    const supabase = supabaseAdmin();

    const { error } = await supabase
      .from("faq_items")
      .update({ is_published: isPublished, updated_at: new Date().toISOString() })
      .eq("id", faqItemId);

    if (error) {
      adminFail("Couldn't update the question. Please try again.", error);
    }

    revalidateFaq();
  });
}

export async function deleteFaqItem(faqItemId: string): Promise<AdminResult> {
  return runAdminAction(async () => {
    await assertAdminAccess();
    const supabase = supabaseAdmin();

    const { error } = await supabase.from("faq_items").delete().eq("id", faqItemId);

    if (error) {
      adminFail("Couldn't delete the question. Please try again.", error);
    }

    revalidateFaq();
  });
}

/**
 * Persists the admin panel's full ▲/▼ ordering in one atomic statement
 * via the reorder_faq_items() SQL function (016_create_faq_items.sql) -
 * each id's sort_order becomes its 1-based position in the array.
 */
export async function reorderFaqItems(orderedIds: string[]): Promise<AdminResult> {
  return runAdminAction(async () => {
    await assertAdminAccess();
    const supabase = supabaseAdmin();

    const parsed = faqReorderSchema.safeParse(orderedIds);
    if (!parsed.success) {
      adminFail(parsed.error.issues[0]?.message ?? "Invalid FAQ order.");
    }

    const { error } = await supabase.rpc("reorder_faq_items", { ids: parsed.data });

    if (error) {
      adminFail("Couldn't save the new order. Please try again.", error);
    }

    revalidateFaq();
  });
}
