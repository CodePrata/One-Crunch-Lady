"use client";

import { ShoppingCart, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef } from "react";
import { useCartCatalogItems } from "@/components/features/CartCatalogProvider";
import CartLineItems from "@/components/features/CartLineItems";
import CheckoutForm from "@/components/features/CheckoutForm";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useCartStore } from "@/lib/store/cart";

export default function CartDrawer() {
  const router = useRouter();
  const isOpen = useCartStore((state) => state.isOpen);
  const closeCart = useCartStore((state) => state.closeCart);
  const { lines, unavailableLines } = useCartCatalogItems();
  const isEmpty = lines.length === 0 && unavailableLines.length === 0;
  const reduceMotion = useReducedMotion();
  const headingId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(isOpen);
  useFocusTrap(panelRef, isOpen);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeCart();
      }
    };

    panelRef.current?.focus();
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, closeCart]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="z-drawer fixed inset-0 flex justify-end">
          <motion.div
            className="absolute inset-0 bg-black/45"
            onClick={closeCart}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            tabIndex={-1}
            ref={panelRef}
            className="relative flex h-full w-full max-w-sm flex-col rounded-l-2xl border-l-[3px] border-cookie-brown bg-flour-white outline-none"
            initial={{ x: reduceMotion ? 0 : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: reduceMotion ? 0 : "100%" }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 300, damping: 32, mass: 1 }
            }
          >
            <div className="flex items-center justify-between gap-4 p-5">
              <h2
                id={headingId}
                className="font-display text-3xl uppercase leading-none text-cookie-brown-dark"
              >
                Your Order
              </h2>
              <button
                type="button"
                onClick={closeCart}
                aria-label="Close cart"
                className="tap-target inline-flex items-center justify-center rounded-md border-2 border-cookie-brown text-cookie-brown-dark"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            <CheckoutForm
              className="flex flex-1 flex-col overflow-hidden"
              onSuccess={(result) => {
                closeCart();
                router.push(`/order/success/${result.orderRef}?t=${result.accessToken}`);
              }}
            >
              {isEmpty ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
                  <ShoppingCart size={40} weight="bold" className="text-cookie-brown-dark" />
                  <p className="text-sm text-cookie-brown-dark">
                    Your cart is empty. Add a few cookies to get started.
                  </p>
                </div>
              ) : (
                <CartLineItems />
              )}
            </CheckoutForm>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
