import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false },
};

export default function NotFound() {
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}`
    : "https://wa.me/";

  return (
    <main className="responsive-shell px-4 py-14 tablet:px-6 desktop:px-8">
      <section className="rounded-2xl border-[3px] border-cookie-brown bg-flour-white p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-cookie-brown-dark">
          404
        </p>
        <h1 className="mt-2 font-display text-5xl uppercase text-cookie-brown-dark">
          Page Not Found
        </h1>
        <p className="mt-3 text-cookie-brown-dark">
          We couldn&rsquo;t find what you were looking for. If you followed a link from an
          order confirmation, it may have been mistyped - message us on WhatsApp and
          we&rsquo;ll help you out directly.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="tap-target inline-flex items-center justify-center rounded-md border-[3px] border-cookie-brown bg-power-red px-5 font-bold text-flour-white"
          >
            Back to Home
          </Link>
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
