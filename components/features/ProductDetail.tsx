"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { getOptimizedImage } from "@/lib/cloudinary";

interface ProductDetailProps {
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
  name,
  description,
  price,
  imageUrl,
  ingredients,
  isAvailable,
}: ProductDetailProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const formattedPrice = `$${price.toFixed(2)}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="tap-target inline-flex items-center justify-center rounded-md border-2 border-cookie-brown bg-flour-white px-4 text-sm font-semibold text-cookie-brown transition hover:bg-hero-yellow/30"
      >
        View Details
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 tablet:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            tabIndex={-1}
            ref={dialogRef}
            className="w-full max-w-2xl rounded-t-2xl border-[3px] border-cookie-brown bg-flour-white p-5 outline-none tablet:rounded-2xl tablet:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2
                id={headingId}
                className="font-display text-4xl uppercase leading-none text-cookie-brown"
              >
                {name}
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="tap-target rounded-md border-2 border-cookie-brown px-3 text-cookie-brown"
                aria-label="Close product details"
              >
                Close
              </button>
            </div>

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

            <p className="text-base text-cookie-brown">{description}</p>
            <p className="mt-3 inline-flex rounded-md border-2 border-cookie-brown bg-hero-yellow px-3 py-1 text-lg font-bold text-cookie-brown">
              {formattedPrice}
            </p>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowIngredients((current) => !current)}
                className="tap-target inline-flex items-center rounded-md border-2 border-cookie-brown px-3 text-sm font-semibold text-cookie-brown"
                aria-expanded={showIngredients}
              >
                {showIngredients ? "Hide Ingredients" : "Show Ingredients"}
              </button>

              {showIngredients ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-cookie-brown">
                  {ingredients.map((ingredient) => (
                    <li key={ingredient}>{ingredient}</li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="mt-6">
              <button
                type="button"
                disabled={!isAvailable}
                className="tap-target inline-flex w-full items-center justify-center rounded-md border-[3px] border-cookie-brown bg-power-red px-4 text-base font-bold text-flour-white disabled:cursor-not-allowed disabled:bg-cookie-brown"
              >
                Add to Order
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
