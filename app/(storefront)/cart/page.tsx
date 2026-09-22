"use client";

import { ShoppingCart } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCartCatalogItems } from "@/components/features/CartCatalogProvider";
import CartLineItems from "@/components/features/CartLineItems";
import CheckoutForm from "@/components/features/CheckoutForm";
import { useCartStore } from "@/lib/store/cart";

/**
 * Full-page cart, reached via the header's "Cart" nav link. The floating
 * cart bubble + slide-over drawer (components/features/CartDrawer.tsx)
 * are untouched and keep working exactly as before - this is an
 * additional surface over the same store and the same shared
 * CartLineItems/CheckoutForm, not a replacement.
 */
export default function CartPage() {
  const router = useRouter();
  const { lines, unavailableLines } = useCartCatalogItems();
  const isEmpty = lines.length === 0 && unavailableLines.length === 0;
  const isDrawerOpen = useCartStore((state) => state.isOpen);
  const closeCart = useCartStore((state) => state.closeCart);
  // CheckoutForm clears the cart synchronously on success, before
  // router.push() has actually swapped this page out (order/success is a
  // live, dynamically-rendered route - that swap isn't instant). Without
  // this, isEmpty flips true immediately and the customer briefly sees
  // "your cart is empty" while the redirect is still in flight.
  const [isRedirecting, setIsRedirecting] = useState(false);

  // The drawer is a global overlay mounted in the storefront layout - it
  // doesn't unmount on navigation. If a customer opened it (e.g. via the
  // floating bubble) and then followed the header's Cart link here, close
  // it so they aren't looking at two cart UIs stacked on top of each
  // other. Deliberately mount-only: shouldn't re-fire (and force-close a
  // drawer the customer just reopened) on every isOpen change.
  useEffect(() => {
    if (isDrawerOpen) {
      closeCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="responsive-shell px-4 py-10 tablet:px-6 desktop:px-8">
      <h1 className="font-display text-5xl uppercase leading-none text-cookie-brown-dark tablet:text-6xl">
        Your Cart
      </h1>

      <div className="mx-auto mt-8 max-w-2xl">
        <div className="impact-border rounded-2xl bg-flour-white p-6 tablet:p-8">
          {isRedirecting ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div
                className="h-10 w-10 animate-spin rounded-full border-[3px] border-cookie-brown border-r-transparent"
                role="status"
                aria-label="Loading"
              />
              <p className="text-base text-cookie-brown-dark">
                Order placed! Taking you to your confirmation...
              </p>
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <ShoppingCart size={48} weight="bold" className="text-cookie-brown-dark" />
              <p className="text-base text-cookie-brown-dark">
                Your cart is empty. Add a few cookies to get started.
              </p>
              <Link
                href="/products"
                className="tap-target inline-flex items-center justify-center rounded-md border-[3px] border-cookie-brown bg-power-red px-6 text-base font-semibold text-flour-white"
              >
                Browse Products
              </Link>
            </div>
          ) : (
            <CheckoutForm
              onSuccess={(result) => {
                setIsRedirecting(true);
                router.push(`/order/success/${result.orderRef}?t=${result.accessToken}`);
              }}
            >
              <CartLineItems />
            </CheckoutForm>
          )}
        </div>
      </div>
    </main>
  );
}
