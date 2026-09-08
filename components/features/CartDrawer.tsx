"use client";

import { Minus, Plus, ShoppingCart, TrashSimple, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useId, useRef } from "react";
import { useCartCatalogItems } from "@/components/features/CartCatalogProvider";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { getOptimizedImage } from "@/lib/cloudinary";
import { CART_MAX_ITEM_QUANTITY, useCartStore } from "@/lib/store/cart";

export default function CartDrawer() {
  const isOpen = useCartStore((state) => state.isOpen);
  const closeCart = useCartStore((state) => state.closeCart);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const { lines, unavailableLines, subtotal, itemCount } = useCartCatalogItems();
  const reduceMotion = useReducedMotion();
  const headingId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(isOpen);

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

  const isEmpty = lines.length === 0 && unavailableLines.length === 0;

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
                className="font-display text-3xl uppercase leading-none text-cookie-brown"
              >
                Your Order
              </h2>
              <button
                type="button"
                onClick={closeCart}
                aria-label="Close cart"
                className="tap-target inline-flex items-center justify-center rounded-md border-2 border-cookie-brown text-cookie-brown"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
              {isEmpty ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
                  <ShoppingCart size={40} weight="bold" className="text-cookie-brown/40" />
                  <p className="text-sm text-cookie-brown">
                    Your cart is empty. Add a few cookies to get started.
                  </p>
                </div>
              ) : (
                <ul className="space-y-5">
                  {lines.map((line) => (
                    <li key={line.product.id} className="flex gap-3">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-cookie-brown bg-flour-white">
                        {line.product.imageUrl ? (
                          <Image
                            src={getOptimizedImage(line.product.imageUrl)}
                            alt={line.product.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-hero-yellow/30 font-display text-2xl text-cookie-brown">
                            {line.product.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col gap-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-display text-xl uppercase leading-none text-cookie-brown">
                            {line.product.name}
                          </p>
                          <p className="text-sm font-bold text-cookie-brown">
                            ${line.lineTotal.toFixed(2)}
                          </p>
                        </div>
                        <p className="text-xs text-cookie-brown/70">
                          ${line.product.price.toFixed(2)} each
                        </p>

                        <div className="mt-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setQuantity(line.product.id, line.quantity - 1)}
                            aria-label={`Decrease ${line.product.name} quantity`}
                            className="tap-target inline-flex h-9 w-9 items-center justify-center rounded-md border-2 border-cookie-brown text-cookie-brown"
                          >
                            <Minus size={14} weight="bold" />
                          </button>
                          <span
                            className="min-w-[1.5rem] text-center text-sm font-semibold text-cookie-brown"
                            aria-label={`${line.product.name} quantity ${line.quantity}`}
                          >
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuantity(line.product.id, line.quantity + 1)}
                            disabled={line.quantity >= CART_MAX_ITEM_QUANTITY}
                            aria-label={`Increase ${line.product.name} quantity`}
                            className="tap-target inline-flex h-9 w-9 items-center justify-center rounded-md border-2 border-cookie-brown text-cookie-brown disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Plus size={14} weight="bold" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(line.product.id)}
                            aria-label={`Remove ${line.product.name} from cart`}
                            className="tap-target ml-auto inline-flex h-9 w-9 items-center justify-center rounded-md text-cookie-brown/60 transition hover:text-power-red"
                          >
                            <TrashSimple size={16} weight="bold" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}

                  {unavailableLines.map((line) => (
                    <li
                      key={line.product.id}
                      className="flex items-center gap-3 rounded-xl border-2 border-cookie-brown/30 p-3 opacity-60"
                    >
                      <div className="flex-1">
                        <p className="font-display text-lg uppercase leading-none text-cookie-brown">
                          {line.product.name}
                        </p>
                        <p className="text-xs font-semibold uppercase text-power-red">
                          Currently sold out, not included in your total
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(line.product.id)}
                        aria-label={`Remove ${line.product.name} from cart`}
                        className="tap-target inline-flex h-9 w-9 items-center justify-center rounded-md text-cookie-brown/60 transition hover:text-power-red"
                      >
                        <TrashSimple size={16} weight="bold" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {lines.length > 0 ? (
              <div className="border-t-2 border-cookie-brown p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold uppercase tracking-wide text-cookie-brown">
                    Subtotal ({itemCount} item{itemCount === 1 ? "" : "s"})
                  </p>
                  <p className="font-display text-3xl text-cookie-brown">${subtotal.toFixed(2)}</p>
                </div>
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
