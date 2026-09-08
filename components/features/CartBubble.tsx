"use client";

import { ShoppingCart } from "@phosphor-icons/react";
import { useCartCatalogItems } from "@/components/features/CartCatalogProvider";
import { useCartHasHydrated, useCartStore } from "@/lib/store/cart";

export default function CartBubble() {
  const hasHydrated = useCartHasHydrated();
  const toggleCart = useCartStore((state) => state.toggleCart);
  const { itemCount } = useCartCatalogItems();

  // Gate the badge on hydration so the server-rendered pass and the first
  // client paint agree on "no badge" - the real count applies a tick later.
  const showBadge = hasHydrated && itemCount > 0;

  return (
    <button
      type="button"
      onClick={toggleCart}
      aria-label={
        showBadge ? `Open cart, ${itemCount} item${itemCount === 1 ? "" : "s"}` : "Open cart"
      }
      className="z-cart-bubble fixed bottom-5 right-5 flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-cookie-brown bg-power-red text-flour-white shadow-[4px_4px_0_0_#8D6E63] transition hover:brightness-95 active:scale-95"
    >
      <ShoppingCart size={26} weight="bold" aria-hidden="true" />
      {showBadge ? (
        <span
          aria-hidden="true"
          className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-flour-white bg-power-red px-1 text-xs font-bold text-flour-white"
        >
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      ) : null}
    </button>
  );
}
