"use client";

import { Minus, Plus, TrashSimple } from "@phosphor-icons/react";
import Image from "next/image";
import { useCartCatalogItems } from "@/components/features/CartCatalogProvider";
import { CART_MAX_ITEM_QUANTITY, useCartStore } from "@/lib/store/cart";

/**
 * Shared cart line-item list: available lines with quantity steppers +
 * remove, and sold-out lines with just a remove action. Used by both the
 * cart drawer and the full /cart page so the two can never drift out of
 * sync - both read the same CartCatalogProvider-joined data and the same
 * store actions, this is just the one shared rendering of it.
 *
 * Renders nothing if the cart is fully empty - callers own their own
 * empty-state messaging (the drawer's is compact, the page's has more
 * room to work with).
 */
export default function CartLineItems() {
  const { lines, unavailableLines } = useCartCatalogItems();
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  if (lines.length === 0 && unavailableLines.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-5">
      {lines.map((line) => (
        <li key={line.product.id} className="flex gap-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-cookie-brown bg-flour-white">
            {line.product.imageUrl ? (
              <Image
                src={line.product.imageUrl}
                alt={line.product.name}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-hero-yellow/30 font-display text-2xl text-cookie-brown-dark">
                {line.product.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-start justify-between gap-2">
              <p className="font-display text-xl uppercase leading-none text-cookie-brown-dark">
                {line.product.name}
              </p>
              <p className="text-sm font-bold text-cookie-brown-dark">
                ${line.lineTotal.toFixed(2)}
              </p>
            </div>
            <p className="text-xs text-cookie-brown-dark">${line.product.price.toFixed(2)} each</p>

            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity(line.product.id, line.quantity - 1)}
                aria-label={`Decrease ${line.product.name} quantity`}
                className="tap-target inline-flex h-9 w-9 items-center justify-center rounded-md border-2 border-cookie-brown text-cookie-brown-dark"
              >
                <Minus size={14} weight="bold" />
              </button>
              <span
                className="min-w-[1.5rem] text-center text-sm font-semibold text-cookie-brown-dark"
                aria-label={`${line.product.name} quantity ${line.quantity}`}
              >
                {line.quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(line.product.id, line.quantity + 1)}
                disabled={line.quantity >= CART_MAX_ITEM_QUANTITY}
                aria-label={`Increase ${line.product.name} quantity`}
                className="tap-target inline-flex h-9 w-9 items-center justify-center rounded-md border-2 border-cookie-brown text-cookie-brown-dark disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={14} weight="bold" />
              </button>
              <button
                type="button"
                onClick={() => removeItem(line.product.id)}
                aria-label={`Remove ${line.product.name} from cart`}
                className="tap-target ml-auto inline-flex h-9 w-9 items-center justify-center rounded-md text-cookie-brown-dark transition hover:text-power-red"
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
            <p className="font-display text-lg uppercase leading-none text-cookie-brown-dark">
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
            className="tap-target inline-flex h-9 w-9 items-center justify-center rounded-md text-cookie-brown-dark transition hover:text-power-red"
          >
            <TrashSimple size={16} weight="bold" />
          </button>
        </li>
      ))}
    </ul>
  );
}
