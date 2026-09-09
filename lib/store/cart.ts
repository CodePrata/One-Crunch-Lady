"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Mirrors the per-item cap in lib/validations/order.ts's quantities schema. */
export const CART_MAX_ITEM_QUANTITY = 10;

const CART_STORAGE_KEY = "ocl-cart";

export interface CartLineItem {
  /** Foreign key into public.products. Never store price/name/category here. */
  productId: string;
  quantity: number;
}

export interface CartToast {
  id: number;
  message: string;
}

interface CartState {
  items: CartLineItem[];
  hasHydrated: boolean;
  isOpen: boolean;
  toast: CartToast | null;
  setHasHydrated: (value: boolean) => void;
  addItem: (productId: string, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  /**
   * Drops any cart line whose productId is not in a freshly-fetched
   * catalog id list. Guards against a cart persisted for days across a
   * product being deleted or renamed (id no longer resolves at all).
   * A product that's merely toggled unavailable is NOT removed here -
   * that case is surfaced in the UI instead (see useCartCatalogItems),
   * since the owner may re-stock it and the customer's selection should
   * survive that.
   */
  reconcileWithCatalog: (catalogProductIds: string[]) => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  /** Shows a brief confirmation toast (e.g. "X added to cart"). Never persisted. */
  showToast: (message: string) => void;
  /** Clears the toast only if `id` still matches the current one - guards
   *  against a stale auto-dismiss timer clearing a newer toast. */
  dismissToast: (id: number) => void;
}

let toastIdCounter = 0;

function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) {
    return 0;
  }
  return Math.max(0, Math.min(CART_MAX_ITEM_QUANTITY, Math.round(quantity)));
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      hasHydrated: false,
      isOpen: false,
      toast: null,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      addItem: (productId, quantity = 1) => {
        const existing = get().items.find((item) => item.productId === productId);
        get().setQuantity(productId, (existing?.quantity ?? 0) + quantity);
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        }));
      },

      setQuantity: (productId, quantity) => {
        const nextQuantity = clampQuantity(quantity);

        set((state) => {
          const existing = state.items.find((item) => item.productId === productId);

          if (nextQuantity <= 0) {
            return existing
              ? { items: state.items.filter((item) => item.productId !== productId) }
              : state;
          }

          if (!existing) {
            return { items: [...state.items, { productId, quantity: nextQuantity }] };
          }

          return {
            items: state.items.map((item) =>
              item.productId === productId ? { ...item, quantity: nextQuantity } : item
            ),
          };
        });
      },

      clearCart: () => set({ items: [] }),

      reconcileWithCatalog: (catalogProductIds) => {
        const validIds = new Set(catalogProductIds);
        set((state) => {
          const nextItems = state.items.filter((item) => validIds.has(item.productId));
          return nextItems.length === state.items.length ? state : { items: nextItems };
        });
      },

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      showToast: (message) => {
        toastIdCounter += 1;
        set({ toast: { id: toastIdCounter, message } });
      },

      dismissToast: (id) => {
        set((state) => (state.toast?.id === id ? { toast: null } : state));
      },
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // Persist only {productId, quantity}. Price, name, availability, and
      // drawer-open state are never persisted - they're re-derived fresh
      // from the product catalog on every render (see useCartCatalogItems
      // in CartCatalogProvider) so a cart left open for days can never
      // checkout at a stale price or a deleted/sold-out item.
      partialize: (state) => ({ items: state.items }),
      // Rehydrate manually (see useCartHasHydrated) so the server-rendered
      // pass and the first client paint agree on an empty cart; the real
      // localStorage value is applied a tick later, after mount.
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

let hasStartedRehydration = false;

/**
 * Call once near the root of the cart UI (the cart bubble already does
 * this). Triggers the deferred localStorage read on mount and reports
 * whether it has finished, so consumers can render a stable placeholder
 * (e.g. no badge count) until then instead of flashing a hydration
 * mismatch between server and client markup.
 */
export function useCartHasHydrated(): boolean {
  const hasHydrated = useCartStore((state) => state.hasHydrated);

  useEffect(() => {
    if (hasStartedRehydration) {
      return;
    }
    hasStartedRehydration = true;
    void useCartStore.persist.rehydrate();
  }, []);

  return hasHydrated;
}
