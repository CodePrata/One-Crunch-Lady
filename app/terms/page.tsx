import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms that apply when you order from One Crunch Lady: order acceptance, pricing, pickup, allergens, and liability.",
};

export default function TermsPage() {
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}`
    : "https://wa.me/";

  return (
    <main className="responsive-shell px-4 py-10 tablet:px-6 desktop:px-8">
      <article className=" rounded-xl border-2 border-cookie-brown bg-hero-yellow p-6 tablet:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-cookie-brown-dark">
          One Crunch Lady
        </p>
        <h1 className="mt-2 font-display text-5xl uppercase leading-tight text-cookie-brown-dark tablet:text-6xl">
          Terms & Conditions
        </h1>
        <p className="mt-2 text-sm text-cookie-brown-dark">
          These terms apply whenever you place an order with One Crunch Lady. Please read
          them alongside our{" "}
          <Link
            href="/privacy"
            className="font-semibold underline underline-offset-2"
          >
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link
            href="/refund"
            className="font-semibold underline underline-offset-2"
          >
            Refund &amp; Cancellation Policy
          </Link>
          .
        </p>

        <section className="mt-8 space-y-4 border-t-2 border-cookie-brown pt-8">
          <h2 className="font-display text-3xl uppercase text-cookie-brown-dark">
            When an order is accepted
          </h2>
          <p className="text-base leading-relaxed text-cookie-brown-dark">
            Submitting the order form on this site is a request to buy, not a confirmed
            sale. Your order is only confirmed once we receive and accept your PayNow
            payment proof over WhatsApp. Until then, we may decline an order - for
            example, if an item sold out between you adding it to your cart and
            checking out.
          </p>
        </section>

        <section className="mt-8 space-y-4 border-t-2 border-cookie-brown pt-8">
          <h2 className="font-display text-3xl uppercase text-cookie-brown-dark">
            Pricing & availability
          </h2>
          <p className="text-base leading-relaxed text-cookie-brown-dark">
            Prices shown at checkout are re-checked against our current prices when you
            submit your order, so the amount you are asked to pay is always current.
            Items are made in small batches and may sell out without notice; a sold-out
            item cannot be added to your total.
          </p>
        </section>

        <section className="mt-8 space-y-4 border-t-2 border-cookie-brown pt-8">
          <h2 className="font-display text-3xl uppercase text-cookie-brown-dark">
            Pickup terms
          </h2>
          <p className="text-base leading-relaxed text-cookie-brown-dark">
            Orders are for self-collection at the pickup arrangement we confirm with you
            over WhatsApp after payment. Please arrive within the agreed window - see our{" "}
            <Link
              href="/refund"
              className="font-semibold underline underline-offset-2"
            >
              Refund &amp; Cancellation Policy
            </Link>{" "}
            for what happens if an order is not collected.
          </p>
        </section>

        <section className="mt-8 space-y-4 border-t-2 border-cookie-brown pt-8">
          <h2 className="font-display text-3xl uppercase text-cookie-brown-dark">
            Allergen disclaimer
          </h2>
          <p className="text-base leading-relaxed text-cookie-brown-dark">
            Our cookies are home-baked in a kitchen that also handles{" "}
            <strong className="text-cookie-brown-dark">
              wheat/gluten, eggs, dairy, nuts, peanuts, and soy
            </strong>
            . Every product lists its ingredients, but we cannot guarantee any item is
            free of trace allergens from shared equipment. If you have a food allergy or
            intolerance, please message us on WhatsApp before ordering so we can advise
            you.
          </p>
        </section>

        <section className="mt-8 space-y-4 border-t-2 border-cookie-brown pt-8">
          <h2 className="font-display text-3xl uppercase text-cookie-brown-dark">
            Limitation of liability
          </h2>
          <p className="text-base leading-relaxed text-cookie-brown-dark">
            We take reasonable care in preparing every order, but to the extent
            permitted by law, our liability for any issue with an order is limited to
            the amount you paid for that order. We are not liable for indirect or
            consequential loss, or for reactions arising from allergens disclosed in our
            ingredient lists or in response to a query you raised with us before
            ordering.
          </p>
        </section>

        <section className="mt-8 space-y-4 border-t-2 border-cookie-brown pt-8">
          <h2 className="font-display text-3xl uppercase text-cookie-brown-dark">
            Contact
          </h2>
          <p className="text-base leading-relaxed text-cookie-brown-dark">
            Questions about these terms? Reach out on{" "}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-power-red underline underline-offset-2"
            >
              WhatsApp
            </a>
            .
          </p>
        </section>

        <p className="mt-10 rounded-md border-2 border-cookie-brown bg-flour-white/40 px-4 py-3 text-center text-sm font-semibold text-cookie-brown-dark">
          Baked with Mom Strength. Thank you for trusting us with your order.
        </p>

        <p className="mt-6 text-center">
          <Link
            href="/"
            className="tap-target inline-flex items-center justify-center rounded-md border-2 border-cookie-brown px-4 font-semibold text-cookie-brown-dark bg-flour-white"
          >
            Back to home
          </Link>
        </p>
      </article>
    </main>
  );
}
