"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import AddToCartButton from "@/components/features/AddToCartButton";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { getOptimizedImage } from "@/lib/cloudinary";

interface ProductDetailProps {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  ingredients: string[];
  isAvailable: boolean;
}

function ProductPlaceholder({ name }: { name: string }) {
  return (
    <svg
      viewBox="0 0 400 300"
      aria-label={`${name} placeholder`}
      role="img"
      className="h-full w-full"
    >
      <rect x="0" y="0" width="400" height="300" fill="#FAFAFA" />
      <rect
        x="20"
        y="20"
        width="360"
        height="260"
        rx="24"
        fill="#FFD700"
        stroke="#8D6E63"
        strokeWidth="10"
      />
      <text
        x="200"
        y="185"
        textAnchor="middle"
        style={{
          fontFamily: "var(--font-bangers), Impact, sans-serif",
          fontSize: 140,
          fill: "#8D6E63",
        }}
      >
        {name.charAt(0).toUpperCase()}
      </text>
    </svg>
  );
}

export default function ProductDetail({
  id,
  name,
  description,
  price,
  imageUrl,
  ingredients,
  isAvailable,
}: ProductDetailProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingId = useId();

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    dialogRef.current?.focus();
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const formattedPrice = `$${price.toFixed(2)}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="tap-target inline-flex items-center text-sm font-semibold text-cookie-brown-dark underline underline-offset-2 transition hover:text-power-red"
      >
        View Details
      </button>

      {isOpen ? (
        <div
          className="z-modal fixed inset-0 flex items-end justify-center bg-black/45 tablet:items-center"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            tabIndex={-1}
            ref={dialogRef}
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-t-2xl border-[3px] border-cookie-brown bg-flour-white outline-none tablet:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-4 p-5 pb-4 tablet:p-6 tablet:pb-4">
              <div className="flex items-start gap-3">
                <h2
                  id={headingId}
                  className="font-display text-4xl uppercase leading-none text-cookie-brown-dark"
                >
                  {name}
                </h2>
                <p className="shrink-0 pt-1 text-lg font-bold text-cookie-brown-dark">
                  {formattedPrice}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="tap-target shrink-0 rounded-md border-2 border-cookie-brown px-3 text-cookie-brown-dark"
                aria-label="Close product details"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5 tablet:px-6 tablet:pb-6">
              <div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-xl border-2 border-cookie-brown bg-flour-white">
                {imageUrl ? (
                  <Image
                    src={getOptimizedImage(imageUrl)}
                    alt={name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 767px) 100vw, 700px"
                  />
                ) : (
                  <ProductPlaceholder name={name} />
                )}
              </div>

              <p className="text-base text-cookie-brown-dark">{description}</p>

              <div className="mt-5">
                <p className="text-sm font-semibold uppercase tracking-wide text-cookie-brown-dark">
                  Ingredients
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-cookie-brown-dark">
                  {ingredients.map((ingredient) => (
                    <li key={ingredient}>{ingredient}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-6">
                <AddToCartButton
                  productId={id}
                  productName={name}
                  isAvailable={isAvailable}
                  variant="full"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
