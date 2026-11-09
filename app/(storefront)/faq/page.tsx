import type { Metadata } from "next";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { getPublishedFaqItems } from "@/lib/faq";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about ordering from One Crunch Lady.",
};

// Matches app/(storefront)/page.tsx's convention - see lib/faq.ts's doc
// comment for why this and the underlying unstable_cache revalidate
// window are kept in sync. Content is managed from the admin FAQ tab
// (faq_items table, 016_create_faq_items.sql).
export const revalidate = 60;

export default async function FaqPage() {
  const faqItems = await getPublishedFaqItems();

  return (
    <main className="responsive-shell px-4 py-10 tablet:px-6 desktop:px-8">
      <h1 className="font-display text-5xl uppercase leading-none text-cookie-brown-dark tablet:text-6xl">
        FAQ
      </h1>

      {faqItems.length === 0 ? (
        <div className="impact-border mx-auto mt-8 max-w-2xl rounded-2xl bg-hero-yellow/30 p-10 text-center">
          <p className="font-display text-3xl uppercase text-cookie-brown-dark">
            Questions coming soon!
          </p>
          <p className="mt-2 text-base text-cookie-brown-dark">
            In the meantime, drop us a message on the contact page - we&apos;re happy to help.
          </p>
        </div>
      ) : (
        <div className="mx-auto mt-8 max-w-2xl space-y-3">
          {faqItems.map((item) => (
            <details
              key={item.id}
              className="group rounded-xl border-2 border-cookie-brown bg-flour-white p-4 open:bg-hero-yellow/20"
            >
              <summary className="tap-target flex cursor-pointer list-none items-center justify-between gap-3 font-display text-xl uppercase leading-tight text-cookie-brown-dark [&::-webkit-details-marker]:hidden">
                {item.question}
                <CaretDown
                  size={18}
                  weight="bold"
                  className="shrink-0 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-cookie-brown-dark">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      )}
    </main>
  );
}
