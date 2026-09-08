"use client";

import { Check, Plus } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useCartStore } from "@/lib/store/cart";

const CONFIRMATION_DURATION_MS = 900;

interface AddToCartButtonProps {
  productId: string;
  productName: string;
  isAvailable: boolean;
  /** "icon" for the catalog card's compact control, "full" for the detail modal's wide button. */
  variant?: "icon" | "full";
}

/**
 * Isolated client leaf so ProductCard (a Server Component) doesn't need to
 * become a client component just to reach the cart store - see
 * taste-skill's "interactivity isolation" guidance.
 */
export default function AddToCartButton({
  productId,
  productName,
  isAvailable,
  variant = "icon",
}: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const showToast = useCartStore((state) => state.showToast);
  const [justAdded, setJustAdded] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function handleClick() {
    addItem(productId);
    showToast(`${productName} added to cart`);
    setJustAdded(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => setJustAdded(false), CONFIRMATION_DURATION_MS);
  }

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={!isAvailable}
        className="tap-target inline-flex w-full items-center justify-center gap-2 rounded-md border-[3px] border-cookie-brown bg-power-red px-4 text-base font-bold text-flour-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cookie-brown"
      >
        {justAdded ? (
          <>
            <Check size={18} weight="bold" aria-hidden="true" />
            Added to Cart
          </>
        ) : (
          "Add to Cart"
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!isAvailable}
      aria-label={justAdded ? `${productName} added to cart` : `Add ${productName} to cart`}
      className="tap-target inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[3px] border-cookie-brown bg-power-red text-flour-white transition active:scale-[0.97] disabled:cursor-not-allowed disabled:border-cookie-brown/40 disabled:bg-cookie-brown/40"
    >
      {justAdded ? (
        <Check size={18} weight="bold" aria-hidden="true" />
      ) : (
        <Plus size={18} weight="bold" aria-hidden="true" />
      )}
    </button>
  );
}
