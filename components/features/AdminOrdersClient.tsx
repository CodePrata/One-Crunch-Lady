"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminBannersPanel from "@/components/features/admin/AdminBannersPanel";
import AdminOrdersPanel from "@/components/features/admin/AdminOrdersPanel";
import AdminProductsPanel from "@/components/features/admin/AdminProductsPanel";
import AdminPromoCodesPanel from "@/components/features/admin/AdminPromoCodesPanel";
import { createClient } from "@/lib/supabase/client";

interface AdminOrder {
  id: number;
  order_ref: string;
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

interface AdminPromoCode {
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

interface AdminOrdersClientProps {
  initialOrders: AdminOrder[];
  initialProducts: AdminProduct[];
  initialBanners: AdminBanner[];
  initialPromoCodes: AdminPromoCode[];
}

type AdminTab = "ORDERS" | "PRODUCTS" | "BANNERS" | "PROMO_CODES";

const TABS: Array<{ id: AdminTab; label: string }> = [
  { id: "ORDERS", label: "Orders" },
  { id: "PRODUCTS", label: "Products" },
  { id: "BANNERS", label: "Banners" },
  { id: "PROMO_CODES", label: "Promo Codes" },
];

/**
 * Top-level admin dashboard shell: page header (refresh/logout) + a
 * page-level tab switcher, delegating each tab's content to its own
 * panel (components/features/admin/). Previously a single ~600-line
 * file holding orders, product create/edit, and now (Phase 3) discounts
 * and banners too - split for the same reason ProductPlaceholder was
 * flagged as worth extracting: one file was accumulating every admin
 * concern regardless of whether they're related.
 */
export default function AdminOrdersClient({
  initialOrders,
  initialProducts,
  initialBanners,
  initialPromoCodes,
}: AdminOrdersClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<AdminTab>("ORDERS");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <main className="responsive-shell px-4 py-10 tablet:px-6 desktop:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-5xl uppercase text-cookie-brown-dark">
          Admin Dashboard
        </h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.refresh()}
            className="tap-target rounded-md border-2 border-cookie-brown px-4 font-semibold text-cookie-brown-dark"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="tap-target rounded-md border-[3px] border-cookie-brown bg-power-red px-4 font-semibold text-flour-white"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`tap-target rounded-md border-2 border-cookie-brown px-4 text-sm font-semibold ${
              activeTab === tab.id
                ? "bg-cookie-brown text-flour-white"
                : "bg-flour-white text-cookie-brown-dark"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "ORDERS" ? (
        <AdminOrdersPanel initialOrders={initialOrders} onFeedback={setFeedback} />
      ) : null}
      {activeTab === "PRODUCTS" ? (
        <AdminProductsPanel initialProducts={initialProducts} onFeedback={setFeedback} />
      ) : null}
      {activeTab === "BANNERS" ? (
        <AdminBannersPanel initialBanners={initialBanners} onFeedback={setFeedback} />
      ) : null}
      {activeTab === "PROMO_CODES" ? (
        <AdminPromoCodesPanel initialPromoCodes={initialPromoCodes} onFeedback={setFeedback} />
      ) : null}

      {feedback ? (
        <p className="mt-4 text-sm font-semibold text-cookie-brown-dark">{feedback}</p>
      ) : null}
    </main>
  );
}
