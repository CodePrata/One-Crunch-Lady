// Row shapes the admin dashboard works with - snake_case, straight from
// the queries in app/actions/admin.ts (see the "Naming boundary" note in
// CLAUDE.md). Shared by the actions, the tab shell and every panel so a
// new column only has to be added once (audit 2026-11 F-5).

export type OrderStatus = "UNPAID" | "PAID" | "READY" | "COLLECTED" | "CANCELLED" | "EXPIRED";

/** Statuses an admin can move an order to (see transition_order_status, migration 023). */
export type AdminOrderTransition = "PAID" | "READY" | "COLLECTED" | "CANCELLED";

export interface AdminOrderItem {
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface AdminOrder {
  id: number;
  order_ref: string;
  // Nulled by the anonymize_old_orders() cron job (migration 010) once an
  // order is over two years old - the row and its totals stay, the PII
  // does not.
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  order_items: AdminOrderItem[] | null;
  subtotal: number | null;
  discount_amount: number | null;
  promo_code: string | null;
  total_price: number;
  status: OrderStatus;
  created_at: string;
  paid_at: string | null;
  ready_at: string | null;
  closed_at: string | null;
}

export interface AdminProduct {
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

export interface AdminBanner {
  id: string;
  image_url: string;
  alt_text: string;
  sort_order: number;
  is_active: boolean;
  image_width: number | null;
  image_height: number | null;
}

export interface AdminPromoCode {
  id: string;
  code: string;
  discount_type: "PERCENT" | "FIXED";
  discount_value: number;
  min_subtotal: number;
  max_redemptions: number | null;
  redemption_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
}

export interface AdminFaqItem {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
}

export interface AdminBranding {
  header_mascot_url: string | null;
  header_mascot_width: number | null;
  header_mascot_height: number | null;
  header_wordmark_url: string | null;
  header_wordmark_width: number | null;
  header_wordmark_height: number | null;
}

/**
 * What every admin mutation returns (audit 2026-11 B-10). In production
 * Next.js replaces a thrown Server Action error's message with a generic
 * digest, so the owner never saw messages like "That promo code already
 * exists." - returning the message instead keeps it.
 */
export type AdminResult = { ok: true } | { ok: false; error: string };
