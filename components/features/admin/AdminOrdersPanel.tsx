"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { resendOrderConfirmation, updateOrderStatus } from "@/app/actions/admin";
import { createClient } from "@/lib/supabase/client";
import { toWhatsAppNumber } from "@/lib/utils";
import type { AdminOrder, AdminOrderTransition, OrderStatus } from "@/types/admin";

type StatusTab = "ALL" | "UNPAID" | "PAID" | "READY" | "CLOSED";

const TABS: Array<{ id: StatusTab; label: string }> = [
  { id: "ALL", label: "All" },
  { id: "UNPAID", label: "Unpaid" },
  { id: "PAID", label: "Paid" },
  { id: "READY", label: "Ready" },
  { id: "CLOSED", label: "Closed" },
];

const CLOSED_STATUSES: OrderStatus[] = ["COLLECTED", "CANCELLED", "EXPIRED"];

// Brand tokens only, every pair AA-compliant (see CLAUDE.md's palette
// table): cookie-brown-dark on hero-yellow / flour-white, flour-white on
// cookie-brown-dark (~7.1:1) and on power-red (~5:1).
const STATUS_PILL_CLASSES: Record<OrderStatus, string> = {
  UNPAID: "border-cookie-brown bg-hero-yellow text-cookie-brown-dark",
  PAID: "border-cookie-brown-dark bg-cookie-brown-dark text-flour-white",
  READY: "border-power-red bg-power-red text-flour-white",
  COLLECTED: "border-cookie-brown bg-flour-white text-cookie-brown-dark",
  CANCELLED: "border-cookie-brown bg-flour-white text-cookie-brown-dark line-through",
  EXPIRED: "border-cookie-brown bg-flour-white text-cookie-brown-dark line-through",
};

const TRANSITION_LABELS: Record<AdminOrderTransition, string> = {
  PAID: "Mark as Paid",
  READY: "Mark as Ready",
  COLLECTED: "Mark as Collected",
  CANCELLED: "Cancel Order",
};

/** Which buttons each status shows - mirrors transition_order_status (migration 023). */
const NEXT_TRANSITIONS: Record<OrderStatus, AdminOrderTransition[]> = {
  UNPAID: ["PAID", "CANCELLED"],
  PAID: ["READY", "CANCELLED"],
  READY: ["COLLECTED"],
  COLLECTED: [],
  CANCELLED: [],
  EXPIRED: [],
};

const CONFIRM_MESSAGES: Record<AdminOrderTransition, string> = {
  PAID: "Mark this order as PAID? The customer gets a payment-confirmed email.",
  READY: "Mark this order as READY? The customer gets a ready-for-pickup email.",
  COLLECTED: "Mark this order as COLLECTED?",
  CANCELLED:
    "Cancel this order? This can't be undone. No email is sent - if they already paid, refund them yourself.",
};

const dateFormatter = new Intl.DateTimeFormat("en-SG", {
  timeZone: "Asia/Singapore",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

function formatMoney(value: number | null | undefined): string {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

/**
 * Split out of the original single-file AdminOrdersClient. Owns the
 * orders realtime subscription (public.orders via the supabase_realtime
 * publication, 003_indexing_and_rls.sql) - unmounting on a tab switch
 * drops it, which is fine: the list re-syncs from `initialOrders`.
 */
export default function AdminOrdersPanel({
  initialOrders,
  onFeedback,
}: {
  initialOrders: AdminOrder[];
  onFeedback: (message: string) => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [orders, setOrders] = useState<AdminOrder[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<StatusTab>("ALL");
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-orders-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const nextOrder = payload.new as AdminOrder;
        // Capped like fetchOrders, so a long-open dashboard can't grow
        // without limit.
        setOrders((current) => [nextOrder, ...current].slice(0, 500));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        const updatedOrder = payload.new as AdminOrder;
        setOrders((current) =>
          current.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const filteredOrders = useMemo(() => {
    if (activeTab === "ALL") {
      return orders;
    }
    if (activeTab === "CLOSED") {
      return orders.filter((order) => CLOSED_STATUSES.includes(order.status));
    }
    return orders.filter((order) => order.status === activeTab);
  }, [activeTab, orders]);

  // What still has to be baked: every PAID (not yet READY) order, summed
  // per product.
  const bakeList = useMemo(() => {
    const totals = new Map<string, number>();
    for (const order of orders) {
      if (order.status !== "PAID") {
        continue;
      }
      for (const item of order.order_items ?? []) {
        totals.set(item.productName, (totals.get(item.productName) ?? 0) + item.quantity);
      }
    }
    return Array.from(totals.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [orders]);

  async function handleStatusUpdate(orderId: number, status: AdminOrderTransition) {
    if (!window.confirm(CONFIRM_MESSAGES[status])) {
      return;
    }

    setBusyOrderId(orderId);
    const result = await updateOrderStatus(orderId, status);
    setBusyOrderId(null);
    // Refresh either way: a "status changed but email failed" result is
    // still a changed status.
    router.refresh();
    onFeedback(result.ok ? `Order updated to ${status}.` : result.error);
  }

  async function handleResendConfirmation(orderId: number) {
    if (!window.confirm("Send the order confirmation email to this customer again?")) {
      return;
    }

    setBusyOrderId(orderId);
    const result = await resendOrderConfirmation(orderId);
    setBusyOrderId(null);
    onFeedback(result.ok ? "Confirmation email sent again." : result.error);
  }

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="bake-list-heading"
        className="rounded-2xl border-[3px] border-cookie-brown bg-hero-yellow p-6"
      >
        <h2
          id="bake-list-heading"
          className="font-display text-3xl uppercase text-cookie-brown-dark"
        >
          Bake List
        </h2>
        <p className="text-sm text-cookie-brown-dark">Paid orders that aren&apos;t ready yet.</p>
        {bakeList.length === 0 ? (
          <p className="mt-3 text-sm font-semibold text-cookie-brown-dark">
            Nothing to bake right now.
          </p>
        ) : (
          <ul className="mt-3 space-y-1">
            {bakeList.map(([productName, quantity]) => (
              <li key={productName} className="text-base font-semibold text-cookie-brown-dark">
                {quantity} × {productName}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border-[3px] border-cookie-brown bg-flour-white p-6">
        <div className="mb-4 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={activeTab === tab.id}
              className={`tap-target rounded-md border-2 border-cookie-brown px-3 text-sm font-semibold ${
                activeTab === tab.id
                  ? "bg-cookie-brown-dark text-flour-white"
                  : "bg-flour-white text-cookie-brown-dark"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filteredOrders.length === 0 ? (
          <p className="text-sm font-semibold text-cookie-brown-dark">No orders here.</p>
        ) : null}

        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const waNumber = toWhatsAppNumber(order.customer_phone);
            const isBusy = busyOrderId === order.id;
            const hasDiscount = Number(order.discount_amount ?? 0) > 0;

            return (
              <article key={order.id} className="rounded-xl border-2 border-cookie-brown p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-3xl uppercase text-cookie-brown-dark">
                      {order.order_ref}
                    </p>
                    <p className="text-sm text-cookie-brown-dark">
                      {order.customer_name ?? "Anonymised (2+ years old)"} ·{" "}
                      {dateFormatter.format(new Date(order.created_at))}
                    </p>
                    <p className="text-sm font-semibold text-cookie-brown-dark">
                      {formatMoney(order.total_price)}
                    </p>
                    <span
                      className={`mt-1 inline-flex rounded-md border-2 px-2 py-1 text-xs font-bold uppercase ${
                        STATUS_PILL_CLASSES[order.status] ?? STATUS_PILL_CLASSES.UNPAID
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(NEXT_TRANSITIONS[order.status] ?? []).map((transition) => (
                      <button
                        key={transition}
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleStatusUpdate(order.id, transition)}
                        className={
                          transition === "CANCELLED"
                            ? "tap-target rounded-md border-2 border-cookie-brown bg-flour-white px-4 text-sm font-semibold text-cookie-brown-dark disabled:cursor-not-allowed"
                            : transition === "READY"
                              ? "tap-target rounded-md border-[3px] border-cookie-brown bg-power-red px-4 text-sm font-semibold text-flour-white disabled:cursor-not-allowed"
                              : "tap-target rounded-md border-2 border-cookie-brown bg-hero-yellow px-4 text-sm font-semibold text-cookie-brown-dark disabled:cursor-not-allowed"
                        }
                      >
                        {TRANSITION_LABELS[transition]}
                      </button>
                    ))}
                  </div>
                </div>

                <details className="mt-3">
                  <summary className="tap-target flex cursor-pointer items-center text-sm font-semibold text-cookie-brown-dark underline underline-offset-4">
                    Order details
                  </summary>
                  <div className="mt-2 space-y-3 text-sm text-cookie-brown-dark">
                    <ul className="space-y-1">
                      {(order.order_items ?? []).map((item, index) => (
                        <li key={`${item.productName}-${index}`}>
                          {item.quantity} × {item.productName} @ {formatMoney(item.unitPrice)} ={" "}
                          {formatMoney(item.unitPrice * item.quantity)}
                        </li>
                      ))}
                    </ul>
                    {hasDiscount ? (
                      <p>
                        Subtotal {formatMoney(order.subtotal)} · Promo {order.promo_code} −
                        {formatMoney(order.discount_amount)}
                      </p>
                    ) : null}
                    <p className="font-semibold">Total {formatMoney(order.total_price)}</p>

                    {order.customer_phone ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span>Phone: {order.customer_phone}</span>
                        {waNumber ? (
                          <>
                            <a
                              href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                                `Hi ${order.customer_name ?? ""}, this is One Crunch Lady about Order #${order.order_ref}.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="tap-target inline-flex items-center rounded-md border-2 border-cookie-brown px-3 font-semibold"
                            >
                              WhatsApp
                            </a>
                            <a
                              href={`tel:+${waNumber}`}
                              className="tap-target inline-flex items-center rounded-md border-2 border-cookie-brown px-3 font-semibold"
                            >
                              Call
                            </a>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                    {order.customer_email ? <p>Email: {order.customer_email}</p> : null}

                    {order.customer_email && !CLOSED_STATUSES.includes(order.status) ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleResendConfirmation(order.id)}
                        className="tap-target rounded-md border-2 border-cookie-brown px-3 font-semibold text-cookie-brown-dark disabled:cursor-not-allowed"
                      >
                        Resend confirmation email
                      </button>
                    ) : null}
                  </div>
                </details>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
