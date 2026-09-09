import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How One Crunch Lady collects, uses, and protects your personal data in line with Singapore PDPA.",
};

// Bump this whenever the policy text changes below - it is the only source
// for the "Last updated" date shown on the page, so it can't silently drift
// from what the page actually says.
const PRIVACY_POLICY_LAST_UPDATED = "9 September 2026";

// Placeholder business contact for the Data Protection Officer. PDPA
// requires a named DPO with a published business contact - WhatsApp alone
// does not satisfy that. Replace with the owner's real DPO name and a
// monitored mailbox (e.g. privacy@onecrunchlady.sg) before launch.
const DPO_NAME = "One Crunch Lady (Data Protection Officer)";
const DPO_EMAIL = "privacy@onecrunchlady.sg";

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-cookie-brown-dark">
          Last updated {PRIVACY_POLICY_LAST_UPDATED}. This notice describes how we handle
          personal data under Singapore&rsquo;s Personal Data Protection Act (PDPA).
        </p>

        <section className="mt-8 space-y-4 border-t-2 border-cookie-brown pt-8">
          <h2 className="font-display text-3xl uppercase text-cookie-brown-dark">
            What we collect
          </h2>
          <p className="text-base leading-relaxed text-cookie-brown-dark">
            When you place an order, we collect your{" "}
            <strong className="text-cookie-brown-dark">name</strong>,{" "}
            <strong className="text-cookie-brown-dark">email address</strong>, and{" "}
            <strong className="text-cookie-brown-dark">phone number</strong>. We use this
            information solely to fulfil your order, contact you about your purchase,
            and send you transactional updates related to that order.
          </p>
        </section>

        <section className="mt-8 space-y-4 border-t-2 border-cookie-brown pt-8">
          <h2 className="font-display text-3xl uppercase text-cookie-brown-dark">
            How we use your data
          </h2>
          <p className="text-base leading-relaxed text-cookie-brown-dark">
            Your personal data is used only for order processing, payment coordination,
            and communication about your order. We do not use it for unrelated marketing
            unless you have separately agreed to that.
          </p>
        </section>

        <section className="mt-8 space-y-4 border-t-2 border-cookie-brown pt-8">
          <h2 className="font-display text-3xl uppercase text-cookie-brown-dark">
            Sharing and sale of data
          </h2>
          <p className="text-base leading-relaxed text-cookie-brown-dark">
            We <strong className="text-cookie-brown-dark">do not sell</strong> your personal
            data. We <strong className="text-cookie-brown-dark">do not share</strong> it with
            third parties for their own marketing. We may use trusted service providers
            (for example, hosting, email delivery, or payment-related tools) strictly as
            needed to operate the shop, and only under appropriate safeguards.
          </p>
        </section>

        <section className="mt-8 space-y-4 border-t-2 border-cookie-brown pt-8">
          <h2 className="font-display text-3xl uppercase text-cookie-brown-dark">
            Service providers & where your data goes
          </h2>
          <p className="text-base leading-relaxed text-cookie-brown-dark">
            We use a small number of service providers (processors) to run the shop.
            Each only receives the data it needs to do its job:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-base leading-relaxed text-cookie-brown-dark">
            <li>
              <strong className="text-cookie-brown-dark">Supabase</strong> - hosts our
              database and admin login, so it holds your order and contact details.
            </li>
            <li>
              <strong className="text-cookie-brown-dark">Vercel</strong> - hosts this
              website and serves every page you view.
            </li>
            <li>
              <strong className="text-cookie-brown-dark">Resend</strong> - sends the
              transactional emails about your order (received, paid, ready for pickup).
            </li>
            <li>
              <strong className="text-cookie-brown-dark">Cloudinary</strong> - hosts our
              product photos; it does not receive your personal data.
            </li>
          </ul>
          <p className="text-base leading-relaxed text-cookie-brown-dark">
            These providers operate on servers outside Singapore, so your personal data
            may be transferred to and processed in other countries as part of running
            the shop. We only use providers that give equivalent protection to your data
            wherever it is processed, as required under the PDPA.
          </p>
        </section>

        <section className="mt-8 space-y-4 border-t-2 border-cookie-brown pt-8">
          <h2 className="font-display text-3xl uppercase text-cookie-brown-dark">
            Cookies & local storage
          </h2>
          <p className="text-base leading-relaxed text-cookie-brown-dark">
            We do not use a cookie consent banner because everything we store is
            strictly necessary or functional - there is no advertising or tracking
            cookie on this site. Here is everything we store on your device:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-base leading-relaxed text-cookie-brown-dark">
            <li>
              <strong className="text-cookie-brown-dark">splash_dismissed</strong> -
              remembers you have seen the intro screen, so it does not show again.
            </li>
            <li>
              <strong className="text-cookie-brown-dark">last_submission</strong> - a
              short-lived, security-only cookie that stops the order form being
              submitted twice in a row.
            </li>
            <li>
              <strong className="text-cookie-brown-dark">Supabase auth cookies</strong> -
              set only if you are the shop owner signed in to the admin dashboard.
            </li>
            <li>
              <strong className="text-cookie-brown-dark">Your cart</strong> - kept in
              your browser&rsquo;s local storage so it survives a page refresh; it never
              leaves your device until you check out.
            </li>
          </ul>
          <p className="text-base leading-relaxed text-cookie-brown-dark">
            We also use Vercel Analytics, which is cookieless and does not identify you
            individually.
          </p>
        </section>

        <section className="mt-8 space-y-4 border-t-2 border-cookie-brown pt-8">
          <h2 className="font-display text-3xl uppercase text-cookie-brown-dark">
            Retention
          </h2>
          <p className="text-base leading-relaxed text-cookie-brown-dark">
            We run two separate retention clocks. Your{" "}
            <strong className="text-cookie-brown-dark">
              name, email address, and phone number
            </strong>{" "}
            are anonymised automatically{" "}
            <strong className="text-cookie-brown-dark">two (2) years</strong> after your
            order. Separately, Singapore&rsquo;s IRAS record-keeping requirements mean we keep
            the{" "}
            <strong className="text-cookie-brown-dark">
              financial details of the order
            </strong>{" "}
            (order reference, items ordered, and total paid) for{" "}
            <strong className="text-cookie-brown-dark">five (5) years</strong>, as required
            by law. Only your personal data is removed at the two-year mark - the order
            record itself, stripped of anything that identifies you, is kept for the
            longer period the law requires.
          </p>
        </section>

        <section className="mt-8 space-y-4 border-t-2 border-cookie-brown pt-8">
          <h2 className="font-display text-3xl uppercase text-cookie-brown-dark">
            Your rights & deletion requests
          </h2>
          <p className="text-base leading-relaxed text-cookie-brown-dark">
            Under the PDPA, you may request access to or correction of your personal data,
            or ask us to stop using it in certain ways. You may also request deletion of
            your personal data where applicable.
          </p>
          <p className="text-base leading-relaxed text-cookie-brown-dark">
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
          <h2 className="font-display text-3xl uppercase text-cookie-brown-dark">
            Data Protection Officer
          </h2>
          <p className="text-base leading-relaxed text-cookie-brown-dark">
            Under the PDPA we have designated a Data Protection Officer responsible for
            this policy and for handling your requests.
          </p>
          <p className="text-base leading-relaxed text-cookie-brown-dark">
            <strong className="text-cookie-brown-dark">{DPO_NAME}</strong>
            <br />
            Email:{" "}
            <a
              href={`mailto:${DPO_EMAIL}`}
              className="font-semibold text-power-red underline underline-offset-2"
            >
              {DPO_EMAIL}
            </a>
          </p>
          <p className="text-base leading-relaxed text-cookie-brown-dark">
            You can also reach us on{" "}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-power-red underline underline-offset-2"
            >
              WhatsApp
            </a>{" "}
            for anything else about this policy or your order.
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
