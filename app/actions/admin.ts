"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { emailFrom, resendApiKey } from "@/config/server";
import { pickupHours } from "@/config/site";
import PaymentConfirmedEmail from "@/emails/PaymentConfirmedEmail";
import ReadyForPickupEmail from "@/emails/ReadyForPickupEmail";
import { supabaseAdmin, supabaseServerAuth } from "@/lib/supabase/server";
import { productSchema } from "@/lib/validations/product";

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
    .select("id,name,description,price,image_url,category,ingredients,is_available")
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
  revalidatePath("/");
}
