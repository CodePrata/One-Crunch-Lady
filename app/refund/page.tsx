import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | One Crunch Lady",
  description:
    "Cancellation cutoff, no-show handling, and PayNow refund terms for One Crunch Lady orders.",
};

export default function RefundPage() {
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}`
    : "https://wa.me/";

  return (
    <main className="responsive-shell px-4 py-10 tablet:px-6 desktop:px-8">
      <article className=" rounded-xl border-2 border-cookie-brown bg-hero-yellow p-6 tablet:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-cookie-brown">
          One Crunch Lady
        </p>
        <h1 className="mt-2 font-display text-5xl uppercase leading-tight text-cookie-brown tablet:text-6xl">
          Refund & Cancellation Policy
        </h1>
        <p className="mt-2 text-sm text-cookie-brown">
          We bake to order, in small batches, once payment is confirmed. Because of that,
          this policy is stricter than a typical retail return policy - please read it
          before you pay.
        </p>

        <section className="mt-8 space-y-4 border-t-2 border-cookie-brown pt-8">
          <h2 className="font-display text-3xl uppercase text-cookie-brown">
            Cancelling an order
          </h2>
          <p className="text-base leading-relaxed text-cookie-brown">
            You can cancel for a full refund if you tell us{" "}
            <strong className="text-cookie-brown">at least 24 hours before</strong> your
            scheduled pickup time. Message us on WhatsApp with your order reference to
            cancel.
          </p>
          <p className="text-base leading-relaxed text-cookie-brown">
            Cancellations made less than 24 hours before pickup may not be refundable,
            since baking for your order may already be underway. We will always tell you
            if that is the case before declining a refund.
          </p>
        </section>

        <section className="mt-8 space-y-4 border-t-2 border-cookie-brown pt-8">
          <h2 className="font-display text-3xl uppercase text-cookie-brown">
            Missed pickups
          </h2>
          <p className="text-base leading-relaxed text-cookie-brown">
            If an order is not collected on the scheduled date and you have not arranged
            a new pickup time with us in advance, it is treated as a no-show. Because our
            cookies are perishable and made to order, no-show orders are{" "}
            <strong className="text-cookie-brown">not eligible for a refund</strong>.
          </p>
        </section>

        <section className="mt-8 space-y-4 border-t-2 border-cookie-brown pt-8">
          <h2 className="font-display text-3xl uppercase text-cookie-brown">
            Once your order is collected
          </h2>
          <p className="text-base leading-relaxed text-cookie-brown">
            Our cookies are perishable, freshly baked goods, so we{" "}
            <strong className="text-cookie-brown">cannot accept returns</strong> once an
            order has been collected. This is a food-safety and hygiene requirement, not
            a judgement on your order.
          </p>
        </section>

        <section className="mt-8 space-y-4 border-t-2 border-cookie-brown pt-8">
          <h2 className="font-display text-3xl uppercase text-cookie-brown">
            Quality issues
          </h2>
          <p className="text-base leading-relaxed text-cookie-brown">
            If something is genuinely wrong with your order - wrong item, missing item,
            or a quality problem - message us on WhatsApp within{" "}
            <strong className="text-cookie-brown">24 hours of collection</strong> with a
            photo and your order reference. We will sort out a replacement or a refund
            for the affected item at our discretion. We are not able to action reports
            made after that window, since freshness can no longer be verified.
          </p>
        </section>

        <section className="mt-8 space-y-4 border-t-2 border-cookie-brown pt-8">
          <h2 className="font-display text-3xl uppercase text-cookie-brown">
            How refunds are paid
          </h2>
          <p className="text-base leading-relaxed text-cookie-brown">
            There is no payment gateway here - you pay by PayNow and we confirm it by
            hand, so refunds work the same way. An approved refund is returned by PayNow
            to the same mobile number the payment came from, within{" "}
            <strong className="text-cookie-brown">3-5 business days</strong> of approval.
            We cannot refund to a different PayNow number or bank account.
          </p>
        </section>

        <section className="mt-8 space-y-4 border-t-2 border-cookie-brown pt-8">
          <h2 className="font-display text-3xl uppercase text-cookie-brown">
            Contact
          </h2>
          <p className="text-base leading-relaxed text-cookie-brown">
            For a cancellation, a missed pickup, or a quality issue, reach us on{" "}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-power-red underline underline-offset-2"
            >
              WhatsApp
            </a>{" "}
            with your order reference. See also our{" "}
            <Link
              href="/privacy"
              className="font-semibold text-power-red underline underline-offset-2"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <p className="mt-10 rounded-md border-2 border-cookie-brown bg-flour-white/40 px-4 py-3 text-center text-sm font-semibold text-cookie-brown">
          Baked with Mom Strength. Thank you for trusting us with your order.
        </p>

        <p className="mt-6 text-center">
          <Link
            href="/"
            className="tap-target inline-flex items-center justify-center rounded-md border-2 border-cookie-brown px-4 font-semibold text-cookie-brown bg-flour-white"
          >
            Back to home
          </Link>
        </p>
      </article>
    </main>
  );
}
