"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import PaymentConfirmedEmail from "@/emails/PaymentConfirmedEmail";
import ReadyForPickupEmail from "@/emails/ReadyForPickupEmail";
import { supabaseAdmin, supabaseServerAuth } from "@/lib/supabase/server";

type AdminOrderStatus = "PAID" | "READY";

interface AdminOrder {
  id: number;
  order_ref: string;
  customer_name: string;
  customer_email: string;
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

const ADMIN_EMAIL = "amadeus12321@gmail.com";

async function assertAdminAccess() {
  const authClient = supabaseServerAuth();
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();

  if (error || !user || user.email !== ADMIN_EMAIL) {
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

  const withCategory = await supabase
    .from("products")
    .select(
      "id,name,description,price,image_url,ingredients,category,is_available"
    )
    .order("created_at", { ascending: false });

  if (withCategory.error) {
    const fallback = await supabase
      .from("products")
      .select("id,name,description,price,image_url,ingredients,is_available")
      .order("created_at", { ascending: false });

    if (fallback.error) {
      throw new Error(`Failed to fetch products: ${fallback.error.message}`);
    }

    return (fallback.data ?? []) as AdminProduct[];
  }

  return (withCategory.data ?? []) as AdminProduct[];
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

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && updatedOrder?.customer_email) {
    const resend = new Resend(resendApiKey);
    const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

    try {
      await resend.emails.send({
        from: "One Crunch Lady <orders@resend.dev>",
        to: updatedOrder.customer_email,
        subject:
          status === "PAID"
            ? `Order #${updatedOrder.order_ref} — Payment Received, We're Baking!`
            : `Order #${updatedOrder.order_ref} — Ready for Pickup!`,
        react:
          status === "PAID"
            ? PaymentConfirmedEmail({
                orderRef: updatedOrder.order_ref,
                customerName: updatedOrder.customer_name,
                whatsappNumber,
              })
            : ReadyForPickupEmail({
                orderRef: updatedOrder.order_ref,
                customerName: updatedOrder.customer_name,
                pickupHours: "Mon-Sat, 10:00 AM - 7:00 PM",
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

  const cleanName = data.name.trim();
  const cleanDescription = data.description.trim();
  const cleanImageUrl = data.image_url.trim();
  const cleanIngredients = data.ingredients.trim();
  const cleanPrice = Number(data.price);

  if (
    !cleanName ||
    !cleanDescription ||
    !cleanIngredients ||
    Number.isNaN(cleanPrice)
  ) {
    throw new Error("Please provide valid product details.");
  }

  const slug = slugifyProductName(cleanName);

  const { error: insertErrorWithCategory } = await supabase.from("products").insert({
    name: cleanName,
    slug,
    description: cleanDescription,
    price: cleanPrice,
    image_url: cleanImageUrl || null,
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
}

export async function updateProduct(
  productId: string,
  data: UpdateProductInput
): Promise<void> {
  await assertAdminAccess();
  const supabase = supabaseAdmin();

  const cleanName = data.name.trim();
  const cleanDescription = data.description.trim();
  const cleanImageUrl = data.image_url.trim();
  const cleanIngredients = data.ingredients.trim();
  const cleanPrice = Number(data.price);

  if (
    !productId ||
    !cleanName ||
    !cleanDescription ||
    !cleanIngredients ||
    Number.isNaN(cleanPrice)
  ) {
    throw new Error("Please provide valid product details.");
  }

  const payloadWithCategory = {
    name: cleanName,
    description: cleanDescription,
    price: cleanPrice,
    image_url: cleanImageUrl || null,
    ingredients: cleanIngredients,
  };

  const withCategory = await supabase
    .from("products")
    .update(payloadWithCategory)
    .eq("id", productId);

  if (withCategory.error) {
    const fallback = await supabase
      .from("products")
      .update({
        name: cleanName,
        description: cleanDescription,
        price: cleanPrice,
        image_url: cleanImageUrl || null,
        ingredients: cleanIngredients,
      })
      .eq("id", productId);

    if (fallback.error) {
      throw new Error(`Failed to update product: ${fallback.error.message}`);
    }
  }

  revalidatePath("/admin/orders");
}
