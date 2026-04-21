"use client";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}`
    : "https://wa.me/";

  return (
    <main className="responsive-shell px-4 py-14 tablet:px-6 desktop:px-8">
      <section className="rounded-2xl border-[3px] border-cookie-brown bg-flour-white p-6">
        <h1 className="font-display text-5xl uppercase text-cookie-brown">
          Error
        </h1>
        <p className="mt-3 text-cookie-brown">
          Something went wrong—tap here to order via WhatsApp instead.
        </p>
        <p className="mt-2 text-sm text-cookie-brown/80">{error.message}</p>

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
            className="tap-target inline-flex items-center justify-center rounded-md border-2 border-cookie-brown bg-flour-white px-5 font-semibold text-cookie-brown"
          >
            Contact WhatsApp
          </a>
        </div>
      </section>
    </main>
  );
}
