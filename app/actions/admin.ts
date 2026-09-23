"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { Resend } from "resend";
import { emailFrom, resendApiKey } from "@/config/server";
import { pickupHours } from "@/config/site";
import PaymentConfirmedEmail from "@/emails/PaymentConfirmedEmail";
import ReadyForPickupEmail from "@/emails/ReadyForPickupEmail";
import { BANNERS_CACHE_TAG } from "@/lib/banners";
import { PRODUCTS_CACHE_TAG } from "@/lib/products";
import { supabaseAdmin, supabaseServerAuth } from "@/lib/supabase/server";
import { bannerSchema } from "@/lib/validations/banner";
import { productDiscountSchema, productSchema } from "@/lib/validations/product";

type AdminOrderStatus = "PAID" | "READY";

interface AdminOrder {
  id: number;
  order_ref: string;
  // Nulled by the anonymize_old_orders() cron job (migration 010) once an
  // order is over two years old - the row and its totals stay, the PII does
  // not.
  customer_name: string | null;
  customer_email: string | null;
  total_price: number;
  status: string;
  created_at: string;
}

interface AdminProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  ingredients: string | null;
  category?: string | null;
  is_available: boolean;
  discount_type: "PERCENT" | "FIXED" | null;
  discount_value: number | null;
}

interface AdminBanner {
  id: string;
  image_url: string;
  alt_text: string;
  sort_order: number;
  is_active: boolean;
  image_width: number | null;
  image_height: number | null;
}

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

async function assertAdminAccess() {
  const authClient = supabaseServerAuth();
  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized admin access.");
  }

  const { data: isAdmin, error: isAdminError } = await authClient.rpc("is_admin");

  if (isAdminError || isAdmin !== true) {
    throw new Error("Unauthorized admin access.");
  }
}

export async function fetchOrders(): Promise<AdminOrder[]> {
  await assertAdminAccess();
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("orders")
    .select("id,order_ref,customer_name,customer_email,total_price,status,created_at")
    .order("created_at", { ascending: false });

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

export async function updateOrderStatus(
  orderId: number,
  status: AdminOrderStatus
): Promise<void> {
  await assertAdminAccess();
  const supabase = supabaseAdmin();

  const { data: updatedOrder, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select("order_ref,customer_email,customer_name,total_price")
    .single();

  if (error) {
    throw new Error(`Failed to update order status: ${error.message}`);
  }

  if (updatedOrder?.customer_email) {
    const resend = new Resend(resendApiKey);
    const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

    try {
      await resend.emails.send({
        from: emailFrom,
        to: updatedOrder.customer_email,
        subject:
          status === "PAID"
            ? `Order #${updatedOrder.order_ref}: Payment Received, We're Baking!`
            : `Order #${updatedOrder.order_ref}: Ready for Pickup!`,
        react:
          status === "PAID"
            ? PaymentConfirmedEmail({
                orderRef: updatedOrder.order_ref,
                customerName: updatedOrder.customer_name ?? "Customer",
                whatsappNumber,
              })
            : ReadyForPickupEmail({
                orderRef: updatedOrder.order_ref,
                customerName: updatedOrder.customer_name ?? "Customer",
                pickupHours,
                whatsappNumber,
              }),
      });
    } catch (emailError) {
      console.error("Failed to send status update email", emailError);
    }
  }

  revalidatePath("/admin/orders");
}

export async function toggleProductAvailability(
  productId: string,
  isAvailable: boolean
): Promise<void> {
  await assertAdminAccess();
  const supabase = supabaseAdmin();

  const { error } = await supabase
    .from("products")
    .update({ is_available: isAvailable })
    .eq("id", productId);

  if (error) {
    throw new Error(`Failed to update product availability: ${error.message}`);
  }

  revalidatePath("/admin/orders");
  revalidatePath('/');
  revalidateTag(PRODUCTS_CACHE_TAG);
}

function slugifyProductName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function createProduct(data: CreateProductInput): Promise<void> {
  await assertAdminAccess();
  const supabase = supabaseAdmin();

  const parsed = productSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Please provide valid product details.");
  }

  const {
    name: cleanName,
    description: cleanDescription,
    price: cleanPrice,
    image_url: cleanImageUrl,
    ingredients: cleanIngredients,
  } = parsed.data;
  // Nullable per 008_add_category_to_products.sql - its check constraint
  // rejects an empty/whitespace string, so blank means "no category" (null),
  // not "".
  const cleanCategory = parsed.data.category || null;

  const slug = slugifyProductName(cleanName);

  const { error: insertErrorWithCategory } = await supabase.from("products").insert({
    name: cleanName,
    slug,
    description: cleanDescription,
    price: cleanPrice,
    image_url: cleanImageUrl || null,
    category: cleanCategory,
    ingredients: cleanIngredients,
    is_available: true,
  });

  if (insertErrorWithCategory) {
    if (insertErrorWithCategory.message.includes("ingredients")) {
      const { error: fallbackError } = await supabase.from("products").insert({
        name: cleanName,
        slug,
        description: cleanDescription,
        price: cleanPrice,
        image_url: cleanImageUrl || null,
        category: cleanCategory,
        is_available: true,
      });

      if (fallbackError) {
        throw new Error(`Failed to create product: ${fallbackError.message}`);
      }
    } else {
      throw new Error(`Failed to create product: ${insertErrorWithCategory.message}`);
    }
  }

  revalidatePath("/admin/orders");
  revalidatePath("/");
  revalidateTag(PRODUCTS_CACHE_TAG);
}

export async function updateProduct(
  productId: string,
  data: UpdateProductInput
): Promise<void> {
  await assertAdminAccess();
  const supabase = supabaseAdmin();

  if (!productId) {
    throw new Error("Please provide valid product details.");
  }

  const parsed = productSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Please provide valid product details.");
  }

  const {
    name: cleanName,
    description: cleanDescription,
    price: cleanPrice,
    image_url: cleanImageUrl,
    ingredients: cleanIngredients,
  } = parsed.data;
  // Nullable per 008_add_category_to_products.sql - its check constraint
  // rejects an empty/whitespace string, so blank means "no category" (null),
  // not "".
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
    throw new Error(`Failed to update product: ${error.message}`);
  }

  revalidatePath("/admin/orders");
  revalidateTag(PRODUCTS_CACHE_TAG);
  revalidatePath("/");
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
): Promise<void> {
  await assertAdminAccess();
  const supabase = supabaseAdmin();

  const parsed = productDiscountSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Please provide a valid discount.");
  }

  // A FIXED discount >= price is rejected by the DB check constraint
  // regardless, but checking here first gives a clear error instead of a
  // raw Postgres constraint-violation message reaching the admin UI.
  if (parsed.data.discount_type === "FIXED") {
    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("price")
      .eq("id", productId)
      .single();

    if (fetchError || !product) {
      throw new Error("Product not found.");
    }
    if (parsed.data.discount_value >= product.price) {
      throw new Error("A fixed discount must be less than the product's price.");
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
    throw new Error(`Failed to set discount: ${error.message}`);
  }

  revalidatePath("/admin/orders");
  revalidatePath("/");
  revalidateTag(PRODUCTS_CACHE_TAG);
}

export async function clearProductDiscount(productId: string): Promise<void> {
  await assertAdminAccess();
  const supabase = supabaseAdmin();

  const { error } = await supabase
    .from("products")
    .update({ discount_type: null, discount_value: null })
    .eq("id", productId);

  if (error) {
    throw new Error(`Failed to clear discount: ${error.message}`);
  }

  revalidatePath("/admin/orders");
  revalidatePath("/");
  revalidateTag(PRODUCTS_CACHE_TAG);
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

export async function createBanner(data: CreateBannerInput): Promise<void> {
  await assertAdminAccess();
  const supabase = supabaseAdmin();

  const parsed = bannerSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Please provide valid banner details.");
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
    throw new Error(`Failed to create banner: ${error.message}`);
  }

  revalidatePath("/admin/orders");
  revalidatePath("/promotion");
  revalidateTag(BANNERS_CACHE_TAG);
}

export async function toggleBannerActive(bannerId: string, isActive: boolean): Promise<void> {
  await assertAdminAccess();
  const supabase = supabaseAdmin();

  const { error } = await supabase
    .from("promotion_banners")
    .update({ is_active: isActive })
    .eq("id", bannerId);

  if (error) {
    throw new Error(`Failed to update banner: ${error.message}`);
  }

  revalidatePath("/admin/orders");
  revalidatePath("/promotion");
  revalidateTag(BANNERS_CACHE_TAG);
}

export async function deleteBanner(bannerId: string): Promise<void> {
  await assertAdminAccess();
  const supabase = supabaseAdmin();

  const { error } = await supabase.from("promotion_banners").delete().eq("id", bannerId);

  if (error) {
    throw new Error(`Failed to delete banner: ${error.message}`);
  }

  revalidatePath("/admin/orders");
  revalidatePath("/promotion");
  revalidateTag(BANNERS_CACHE_TAG);
}
