import "server-only";
import { render } from "@react-email/render";
import type { Resend } from "resend";
import { emailFrom, ownerEmail, paynowNumber } from "@/config/server";
import { siteUrl, whatsappNumber } from "@/config/site";
import OrderReceivedEmail from "@/emails/OrderReceivedEmail";
import OwnerAlertEmail from "@/emails/OwnerAlertEmail";
import { sendEmail } from "@/lib/email";

export interface OrderEmailItem {
  productName: string;
  quantity: number;
  unitPrice: number;
}

/** Everything both order-creation emails need, in camelCase. */
export interface OrderEmailData {
  orderRef: string;
  accessToken: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderEmailItem[];
  subtotal: number;
  discountAmount: number;
  promoCode: string | null;
  totalPrice: number;
}

export function orderPageUrl(orderRef: string, accessToken: string): string {
  return `${siteUrl}/order/success/${encodeURIComponent(orderRef)}?t=${encodeURIComponent(accessToken)}`;
}

/**
 * "Order Received" to the customer: items, total, PayNow number and a link
 * back to the success page's QR code. Used by createOrder and by the
 * admin "Resend confirmation" button. Never throws.
 */
export async function sendOrderReceivedEmail(
  resend: Resend,
  order: OrderEmailData
): Promise<boolean> {
  try {
    const element = OrderReceivedEmail({
      orderRef: order.orderRef,
      items: order.items,
      totalPrice: order.totalPrice,
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      promoCode: order.promoCode,
      paynowNumber,
      whatsappNumber,
      orderPageUrl: orderPageUrl(order.orderRef, order.accessToken),
    });

    // html + plain text from the same element: an HTML-only send costs
    // spam-score points on its own.
    const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);

    return await sendEmail(
      resend,
      {
        from: emailFrom,
        to: order.customerEmail,
        // So a customer hitting Reply reaches the owner, not an
        // unmonitored orders@ sender address.
        replyTo: ownerEmail,
        subject: `Order #${order.orderRef} Received!`,
        html,
        text,
      },
      `customer order=${order.orderRef}`
    );
  } catch (error) {
    console.error(`[email:customer order=${order.orderRef}] rendering failed`, error);
    return false;
  }
}

/** "New Order" alert to the owner. Never throws. */
export async function sendOwnerAlertEmail(resend: Resend, order: OrderEmailData): Promise<boolean> {
  try {
    const element = OwnerAlertEmail({
      orderRef: order.orderRef,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      items: order.items,
      totalPrice: order.totalPrice,
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      promoCode: order.promoCode,
      adminDashboardUrl: `${siteUrl}/admin/orders`,
      whatsappNumber,
    });

    const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);

    return await sendEmail(
      resend,
      {
        from: emailFrom,
        to: ownerEmail,
        // So the owner can just hit Reply to email the customer back.
        replyTo: order.customerEmail,
        subject: `New Order: #${order.orderRef}`,
        html,
        text,
      },
      `owner order=${order.orderRef}`
    );
  } catch (error) {
    console.error(`[email:owner order=${order.orderRef}] rendering failed`, error);
    return false;
  }
}
