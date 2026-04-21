"use server";

import { cookies } from "next/headers";
import { Resend } from "resend";
import OrderReceivedEmail from "@/emails/OrderReceivedEmail";
import OwnerAlertEmail from "@/emails/OwnerAlertEmail";
import { createClient } from "@/lib/supabase/server";
import { orderSchema, type OrderFormValues } from "@/lib/validations/order";
import { render } from "@react-email/render";

interface CreateOrderResult {
  success: boolean;
  orderRef?: string;
  error?: string;
}

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

export async function createOrder(
  rawValues: OrderFormValues
): Promise<CreateOrderResult> {
  const cookieStore = cookies();
  const lastSubmission = cookieStore.get("last_submission")?.value;
  const now = Date.now();

  if (lastSubmission && now - Number(lastSubmission) < 60_000) {
    return {
      success: false,
      error: "Please wait a moment before trying again.",
    };
  }

  const sanitizedValues = sanitizePayload(rawValues);
  const parsed = orderSchema.safeParse(sanitizedValues);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid order payload.",
    };
  }

  const values = parsed.data;
  const supabase = createClient();

  const { data: existingOrder, error: existingOrderError } = await supabase
    .from("orders")
    .select("order_ref")
    .eq("idempotency_token", values.idempotencyToken)
    .maybeSingle();

  if (existingOrderError) {
    return {
      success: false,
      error: "Unable to verify existing order. Please try again.",
    };
  }

  if (existingOrder?.order_ref) {
    cookieStore.set("last_submission", String(now), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60,
    });
    return { success: true, orderRef: existingOrder.order_ref };
  }

  const selectedEntries = Object.entries(values.quantities).filter(
    ([, quantity]) => quantity > 0
  );
  const selectedIds = selectedEntries.map(([productId]) => productId);

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id,name,price,is_available")
    .in("id", selectedIds)
    .eq("is_available", true);

  if (productsError || !products || products.length === 0) {
    return {
      success: false,
      error: "No valid products selected. Please update your order.",
    };
  }

  const quantityMap = new Map(selectedEntries);
  const orderItems = products
    .map((product) => {
      const quantity = quantityMap.get(product.id) ?? 0;
      return {
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice: Number(product.price),
      };
    })
    .filter((item) => item.quantity > 0);

  if (orderItems.length === 0) {
    return {
      success: false,
      error: "Please select at least one available item.",
    };
  }

  const cooldownStartIso = new Date(now - 60_000).toISOString();
  const { data: recentOrderByEmail, error: recentOrderByEmailError } =
    await supabase
      .from("orders")
      .select("id")
      .eq("customer_email", values.customerEmail)
      .gte("created_at", cooldownStartIso)
      .limit(1)
      .maybeSingle();

  if (recentOrderByEmailError) {
    return {
      success: false,
      error: "Unable to validate recent submissions. Please try again.",
    };
  }

  const { data: recentOrderByPhone, error: recentOrderByPhoneError } =
    await supabase
      .from("orders")
      .select("id")
      .eq("customer_phone", values.customerPhone)
      .gte("created_at", cooldownStartIso)
      .limit(1)
      .maybeSingle();

  if (recentOrderByPhoneError) {
    return {
      success: false,
      error: "Unable to validate recent submissions. Please try again.",
    };
  }

  if (recentOrderByEmail || recentOrderByPhone) {
    return {
      success: false,
      error: "Please wait a moment before trying again.",
    };
  }

  const totalPrice = orderItems.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0
  );

  const { data: insertedOrder, error: insertError } = await supabase
    .from("orders")
    .insert({
      customer_name: values.customerName,
      customer_email: values.customerEmail,
      customer_phone: values.customerPhone,
      order_items: orderItems,
      total_price: totalPrice,
      idempotency_token: values.idempotencyToken,
    })
    .select("order_ref,total_price,customer_name,customer_email")
    .single();

  if (insertError || !insertedOrder?.order_ref) {
    return {
      success: false,
      error: "We could not submit your order right now. Please try again.",
    };
  }

  cookieStore.set("last_submission", String(now), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60,
  });

  const resendApiKey = process.env.RESEND_API_KEY;
  const ownerEmail = process.env.OWNER_EMAIL;
  const paynowNumber = process.env.PAYNOW_NUMBER ?? "our listed PayNow number";
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (resendApiKey) {
    const resend = new Resend(resendApiKey);

    const emailHtml = await render(
      OrderReceivedEmail({
        orderRef: insertedOrder.order_ref,
        items: orderItems,
        totalPrice,
        paynowNumber,
        whatsappNumber,
      })
    );

    const ownerEmailHtml = await render(
      OwnerAlertEmail({
        orderRef: insertedOrder.order_ref,
        customerName: insertedOrder.customer_name,
        customerEmail: insertedOrder.customer_email,
        customerPhone: values.customerPhone,
        items: orderItems,
        totalPrice: Number(insertedOrder.total_price),
        adminDashboardUrl: `${siteUrl}/admin/orders`,
        whatsappNumber,
      })
    );

    try {
      await resend.emails.send({
        from: "onboarding@resend.dev",
        to: insertedOrder.customer_email,
        subject: `Order #${insertedOrder.order_ref} Received!`,
        html: emailHtml,
      });

      if (ownerEmail) {
        await resend.emails.send({
          from: "onboarding@resend.dev",
          to: ownerEmail,
          subject: `New Order: #${insertedOrder.order_ref}`,
          html: ownerEmailHtml,
        });
      }
    } catch (emailError) {
      console.error("Failed to send order emails", emailError);
    }
  }

  return { success: true, orderRef: insertedOrder.order_ref };
}
