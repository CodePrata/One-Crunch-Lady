"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createPromoCode,
  deletePromoCode,
  togglePromoCodeActive,
} from "@/app/actions/admin";

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

interface PromoCodeDraft {
  code: string;
  discount_type: "PERCENT" | "FIXED";
  discount_value: string;
  min_subtotal: string;
  max_redemptions: string;
  starts_at: string;
  expires_at: string;
}

const EMPTY_PROMO_DRAFT: PromoCodeDraft = {
  code: "",
  discount_type: "PERCENT",
  discount_value: "",
  min_subtotal: "",
  max_redemptions: "",
  starts_at: "",
  expires_at: "",
};

function discountLabel(promo: AdminPromoCode): string {
  return promo.discount_type === "PERCENT"
    ? `${promo.discount_value}% OFF`
    : `$${Number(promo.discount_value).toFixed(2)} OFF`;
}

function formatDateTime(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return new Date(value).toLocaleString("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * New in Phase 4 - manages promo_codes (015_create_promo_codes.sql).
 * Mirrors AdminBannersPanel/AdminProductsPanel's create-form + list
 * shape for consistency. Deliberately never displays anything that would
 * help enumerate codes beyond what an admin - who can already read the
 * whole table - already sees here.
 */
export default function AdminPromoCodesPanel({
  initialPromoCodes,
  onFeedback,
}: {
  initialPromoCodes: AdminPromoCode[];
  onFeedback: (message: string) => void;
}) {
  const router = useRouter();
  const [promoCodes, setPromoCodes] = useState<AdminPromoCode[]>(initialPromoCodes);
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState<PromoCodeDraft>(EMPTY_PROMO_DRAFT);

  useEffect(() => {
    setPromoCodes(initialPromoCodes);
  }, [initialPromoCodes]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await createPromoCode({
        code: draft.code,
        discount_type: draft.discount_type,
        discount_value: Number(draft.discount_value),
        min_subtotal: draft.min_subtotal ? Number(draft.min_subtotal) : undefined,
        max_redemptions: draft.max_redemptions ? Number(draft.max_redemptions) : undefined,
        starts_at: draft.starts_at || undefined,
        expires_at: draft.expires_at || undefined,
      });
      onFeedback("Promo code created.");
      setDraft(EMPTY_PROMO_DRAFT);
      setIsCreating(false);
      router.refresh();
    } catch (error) {
      onFeedback(error instanceof Error ? error.message : "Failed to create promo code.");
    }
  }

  async function handleToggle(promoCodeId: string, isActive: boolean) {
    try {
      await togglePromoCodeActive(promoCodeId, isActive);
      onFeedback("Promo code updated.");
      setPromoCodes((current) =>
        current.map((promo) => (promo.id === promoCodeId ? { ...promo, is_active: isActive } : promo))
      );
      router.refresh();
    } catch (error) {
      onFeedback(error instanceof Error ? error.message : "Failed to update promo code.");
    }
  }

  async function handleDelete(promoCodeId: string) {
    const confirmed = window.confirm("Delete this promo code? This cannot be undone.");
    if (!confirmed) {
      return;
    }

    try {
      await deletePromoCode(promoCodeId);
      onFeedback("Promo code deleted.");
      setPromoCodes((current) => current.filter((promo) => promo.id !== promoCodeId));
      router.refresh();
    } catch (error) {
      onFeedback(error instanceof Error ? error.message : "Failed to delete promo code.");
    }
  }

  return (
    <>
      <section className="mb-8 rounded-2xl border-[3px] border-cookie-brown bg-flour-white p-6">
        <button
          type="button"
          onClick={() => setIsCreating((current) => !current)}
          className="tap-target rounded-md border-[3px] border-cookie-brown bg-power-red px-5 font-bold text-flour-white"
        >
          Add New Promo Code
        </button>

        {isCreating ? (
          <form onSubmit={handleCreate} className="mt-4 grid gap-3">
            <input
              required
              placeholder="Code (e.g. SAVE10)"
              value={draft.code}
              onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))}
              className="tap-target rounded-md border-2 border-cookie-brown px-3"
            />
            <div className="grid gap-3 tablet:grid-cols-2">
              <select
                value={draft.discount_type}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    discount_type: event.target.value as "PERCENT" | "FIXED",
                  }))
                }
                className="tap-target rounded-md border-2 border-cookie-brown px-3"
              >
                <option value="PERCENT">Percentage (%)</option>
                <option value="FIXED">Fixed amount ($)</option>
              </select>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                placeholder={draft.discount_type === "PERCENT" ? "e.g. 10" : "e.g. 5.00"}
                value={draft.discount_value}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, discount_value: event.target.value }))
                }
                className="tap-target rounded-md border-2 border-cookie-brown px-3"
              />
            </div>
            <div className="grid gap-3 tablet:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-cookie-brown-dark">
                  Minimum spend (optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="No minimum"
                  value={draft.min_subtotal}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, min_subtotal: event.target.value }))
                  }
                  className="tap-target w-full rounded-md border-2 border-cookie-brown px-3"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-cookie-brown-dark">
                  Max redemptions (optional)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Unlimited"
                  value={draft.max_redemptions}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, max_redemptions: event.target.value }))
                  }
                  className="tap-target w-full rounded-md border-2 border-cookie-brown px-3"
                />
              </div>
            </div>
            <div className="grid gap-3 tablet:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-cookie-brown-dark">
                  Starts (optional)
                </label>
                <input
                  type="datetime-local"
                  value={draft.starts_at}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, starts_at: event.target.value }))
                  }
                  className="tap-target w-full rounded-md border-2 border-cookie-brown px-3"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-cookie-brown-dark">
                  Expires (optional)
                </label>
                <input
                  type="datetime-local"
                  value={draft.expires_at}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, expires_at: event.target.value }))
                  }
                  className="tap-target w-full rounded-md border-2 border-cookie-brown px-3"
                />
              </div>
            </div>
            <button
              type="submit"
              className="tap-target rounded-md border-2 border-cookie-brown bg-hero-yellow px-4 font-semibold text-cookie-brown-dark"
            >
              Create Promo Code
            </button>
          </form>
        ) : null}
      </section>

      <section className="rounded-2xl border-[3px] border-cookie-brown bg-flour-white p-6">
        <h2 className="font-display text-4xl uppercase text-cookie-brown-dark">Promo Codes</h2>
        {promoCodes.length === 0 ? (
          <p className="mt-4 text-sm text-cookie-brown-dark">No promo codes yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {promoCodes.map((promo) => {
              const starts = formatDateTime(promo.starts_at);
              const expires = formatDateTime(promo.expires_at);

              return (
                <div key={promo.id} className="rounded-xl border-2 border-cookie-brown p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-2xl uppercase leading-none text-cookie-brown-dark">
                        {promo.code}
                      </p>
                      <span className="mt-1 inline-flex rounded-md bg-power-red px-2 py-1 text-xs font-bold uppercase text-flour-white">
                        {discountLabel(promo)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggle(promo.id, !promo.is_active)}
                        className={`tap-target rounded-md border-2 border-cookie-brown px-4 text-sm font-semibold ${
                          promo.is_active
                            ? "bg-hero-yellow text-cookie-brown-dark"
                            : "bg-cookie-brown text-flour-white"
                        }`}
                      >
                        {promo.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(promo.id)}
                        className="tap-target rounded-md border-2 border-cookie-brown px-4 text-sm font-semibold text-cookie-brown-dark transition hover:text-power-red"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-cookie-brown-dark">
                    {promo.min_subtotal > 0
                      ? `Min spend $${Number(promo.min_subtotal).toFixed(2)} · `
                      : ""}
                    Used {promo.redemption_count}
                    {promo.max_redemptions !== null ? ` / ${promo.max_redemptions}` : " (unlimited)"}
                    {starts ? ` · Starts ${starts}` : ""}
                    {expires ? ` · Expires ${expires}` : ""}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
