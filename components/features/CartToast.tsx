"use client";

import { CheckCircle } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect } from "react";
import { useCartStore } from "@/lib/store/cart";

const AUTO_DISMISS_MS = 2000;

/**
 * Global "added to cart" confirmation. Mounted once near the page root;
 * any AddToCartButton triggers it via the shared cart store rather than
 * each card managing its own floating toast.
 */
export default function CartToast() {
  const toast = useCartStore((state) => state.toast);
  const dismissToast = useCartStore((state) => state.dismissToast);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = setTimeout(() => dismissToast(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast, dismissToast]);

  return (
    <div
      className="z-toast pointer-events-none fixed inset-x-0 top-20 flex justify-center px-4"
      aria-live="polite"
    >
      <AnimatePresence>
        {toast ? (
          <motion.div
            key={toast.id}
            role="status"
            initial={{ opacity: 0, y: reduceMotion ? 0 : -16, scale: reduceMotion ? 1 : 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -12, scale: reduceMotion ? 1 : 0.97 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 400, damping: 28, mass: 0.8 }
            }
            className="flex items-center gap-2 rounded-full border-2 border-cookie-brown bg-flour-white px-4 py-2 shadow-[3px_3px_0_0_#8D6E63]"
          >
            <CheckCircle size={20} weight="fill" className="shrink-0 text-power-red" />
            <span className="text-sm font-semibold text-cookie-brown">{toast.message}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
