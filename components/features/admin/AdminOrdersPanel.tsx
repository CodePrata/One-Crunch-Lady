"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { updateOrderStatus } from "@/app/actions/admin";
import { createClient } from "@/lib/supabase/client";

type OrderStatus = "UNPAID" | "PAID" | "READY";
type UpdatableOrderStatus = "PAID" | "READY";
type StatusTab = "ALL" | OrderStatus;

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

const TABS: Array<{ id: StatusTab; label: string }> = [
  { id: "ALL", label: "All" },
  { id: "UNPAID", label: "Unpaid" },
  { id: "PAID", label: "Paid" },
  { id: "READY", label: "Ready" },
];

/**
 * Split out of the original single-file AdminOrdersClient - see that
 * file's own doc comment for why. Owns the orders realtime subscription
 * (public.orders via the supabase_realtime publication, 003_indexing_
 * and_rls.sql) - unmounting on a tab switch drops it, which is fine: the
 * status-tab list re-syncs from `initialOrders` the same way it always
 * has (see the useEffect below), it just doesn't accumulate realtime
 * updates while another tab is active.
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

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-orders-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const nextOrder = payload.new as AdminOrder;
        setOrders((current) => [nextOrder, ...current]);
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
    return orders.filter((order) => order.status === activeTab);
  }, [activeTab, orders]);

  async function handleStatusUpdate(orderId: number, status: UpdatableOrderStatus) {
    const confirmed = window.confirm(`Confirm update: mark this order as ${status}?`);
    if (!confirmed) {
      return;
    }

    try {
      await updateOrderStatus(orderId, status);
      onFeedback(`Order updated to ${status}.`);
      router.refresh();
    } catch (error) {
      onFeedback(error instanceof Error ? error.message : "Failed to update status.");
    }
  }

  return (
    <section className="rounded-2xl border-[3px] border-cookie-brown bg-flour-white p-6">
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`tap-target rounded-md border-2 border-cookie-brown px-3 text-sm font-semibold ${
              activeTab === tab.id
                ? "bg-cookie-brown text-flour-white"
                : "bg-flour-white text-cookie-brown-dark"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredOrders.map((order) => (
          <article key={order.id} className="rounded-xl border-2 border-cookie-brown p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-3xl uppercase text-cookie-brown-dark">
                  {order.order_ref}
                </p>
                <p className="text-sm text-cookie-brown-dark">
                  {order.customer_name ?? "Anonymised (2+ years old)"}
                </p>
                <p className="text-sm font-semibold text-cookie-brown-dark">
                  ${Number(order.total_price).toFixed(2)}
                </p>
                <span
                  className={`mt-1 inline-flex rounded-md px-2 py-1 text-xs font-bold uppercase ${
                    order.status === "UNPAID"
                      ? "bg-gray-300 text-black"
                      : order.status === "PAID"
                        ? "bg-green-600 text-white"
                        : "bg-power-red text-white"
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="tap-target rounded-md border-2 border-cookie-brown bg-hero-yellow px-4 text-sm font-semibold text-cookie-brown-dark disabled:opacity-60"
                  disabled={order.status !== "UNPAID"}
                  onClick={() => handleStatusUpdate(order.id, "PAID")}
                >
                  Mark as Paid
                </button>
                <button
                  type="button"
                  className="tap-target rounded-md border-[3px] border-cookie-brown bg-power-red px-4 text-sm font-semibold text-flour-white disabled:opacity-60"
                  disabled={order.status === "READY"}
                  onClick={() => handleStatusUpdate(order.id, "READY")}
                >
                  Mark as Ready
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
