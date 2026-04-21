import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | One Crunch Lady",
  description:
    "How One Crunch Lady collects, uses, and protects your personal data in line with Singapore PDPA.",
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-cookie-brown">
          Last updated for customers in Singapore. This notice describes how we handle
          personal data under the Personal Data Protection Act (PDPA).
        </p>

        <section className="mt-8 space-y-4 border-t-2 border-cookie-brown pt-8">
          <h2 className="font-display text-3xl uppercase text-cookie-brown">
            What we collect
          </h2>
          <p className="text-base leading-relaxed text-cookie-brown">
            When you place an order, we collect your{" "}
            <strong className="text-cookie-brown">name</strong>,{" "}
            <strong className="text-cookie-brown">email address</strong>, and{" "}
            <strong className="text-cookie-brown">phone number</strong>. We use this
            information solely to fulfil your order, contact you about your purchase,
            and send you transactional updates related to that order.
          </p>
        </section>

        <section className="mt-8 space-y-4 border-t-2 border-cookie-brown pt-8">
          <h2 className="font-display text-3xl uppercase text-cookie-brown">
            How we use your data
          </h2>
          <p className="text-base leading-relaxed text-cookie-brown">
            Your personal data is used only for order processing, payment coordination,
            and communication about your order. We do not use it for unrelated marketing
            unless you have separately agreed to that.
          </p>
        </section>

        <section className="mt-8 space-y-4 border-t-2 border-cookie-brown pt-8">
          <h2 className="font-display text-3xl uppercase text-cookie-brown">
            Sharing and sale of data
          </h2>
          <p className="text-base leading-relaxed text-cookie-brown">
            We <strong className="text-cookie-brown">do not sell</strong> your personal
            data. We <strong className="text-cookie-brown">do not share</strong> it with
            third parties for their own marketing. We may use trusted service providers
            (for example, hosting, email delivery, or payment-related tools) strictly as
            needed to operate the shop, and only under appropriate safeguards.
          </p>
        </section>

        <section className="mt-8 space-y-4 border-t-2 border-cookie-brown pt-8">
          <h2 className="font-display text-3xl uppercase text-cookie-brown">
            Retention
          </h2>
          <p className="text-base leading-relaxed text-cookie-brown">
            We retain order-related personal data for{" "}
            <strong className="text-cookie-brown">two (2) years</strong> from the date
            of the order, unless a longer period is required by law. After that period,
            we delete or anonymise the data where we no longer need it for legal or
            operational purposes.
          </p>
        </section>

        <section className="mt-8 space-y-4 border-t-2 border-cookie-brown pt-8">
          <h2 className="font-display text-3xl uppercase text-cookie-brown">
            Your rights & deletion requests
          </h2>
          <p className="text-base leading-relaxed text-cookie-brown">
            Under the PDPA, you may request access to or correction of your personal data,
            or ask us to stop using it in certain ways. You may also request deletion of
            your personal data where applicable.
          </p>
          <p className="text-base leading-relaxed text-cookie-brown">
            To request deletion or to exercise your rights, contact us via{" "}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-power-red underline underline-offset-2"
            >
              WhatsApp
            </a>
            . Please include your order reference or the email you used when ordering so
            we can verify your request.
          </p>
        </section>

        <section className="mt-8 space-y-4 border-t-2 border-cookie-brown pt-8">
          <h2 className="font-display text-3xl uppercase text-cookie-brown">
            Contact
          </h2>
          <p className="text-base leading-relaxed text-cookie-brown">
            Questions about this policy? Reach out on WhatsApp or through the contact
            details you already use with One Crunch Lady.
          </p>
        </section>

        <p className="mt-10 rounded-md border-2 border-cookie-brown bg-flour-white/40 px-4 py-3 text-center text-sm font-semibold text-cookie-brown">
          Baked with Mom Strength — thank you for trusting us with your order.
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
