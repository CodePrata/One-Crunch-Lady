"use client";

import { useEffect } from "react";
import { whatsappNumber } from "@/config/site";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}` : "https://wa.me/";

  // Full detail stays in the browser console for debugging; the page
  // itself never renders the raw error message, which may contain
  // database detail.
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="responsive-shell px-4 py-14 tablet:px-6 desktop:px-8">
      <section className="rounded-2xl border-[3px] border-cookie-brown bg-flour-white p-6">
        <h1 className="font-display text-5xl uppercase text-cookie-brown-dark">Error</h1>
        <p className="mt-3 text-cookie-brown-dark">
          Something went wrong. Tap here to order via WhatsApp instead.
        </p>
        {error.digest ? (
          <p className="mt-2 text-sm text-cookie-brown-dark">
            Reference for support: {error.digest}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="tap-target inline-flex items-center justify-center rounded-md border-[3px] border-cookie-brown bg-power-red px-5 font-bold text-flour-white"
          >
            Reload Page
          </button>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="tap-target inline-flex items-center justify-center rounded-md border-2 border-cookie-brown bg-flour-white px-5 font-semibold text-cookie-brown-dark"
          >
            Contact WhatsApp
          </a>
        </div>
      </section>
    </main>
  );
}
