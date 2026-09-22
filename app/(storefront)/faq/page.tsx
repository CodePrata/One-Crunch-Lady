import type { Metadata } from "next";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about ordering from One Crunch Lady.",
};

interface FaqItem {
  question: string;
  answer: string;
}

// Placeholder copy (Lorem Ipsum) per the client's request - swap each
// `question`/`answer` below for real content later. The page structure
// itself doesn't need to change: add, remove, or reorder entries here and
// the accordion below picks it up automatically.
const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Lorem ipsum dolor sit amet, consectetur adipiscing elit?",
    answer:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
  },
  {
    question: "Duis aute irure dolor in reprehenderit in voluptate?",
    answer:
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  },
  {
    question: "Sed ut perspiciatis unde omnis iste natus error sit voluptatem?",
    answer:
      "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
  },
  {
    question: "Nemo enim ipsam voluptatem quia voluptas sit aspernatur?",
    answer:
      "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.",
  },
  {
    question: "At vero eos et accusamus et iusto odio dignissimos?",
    answer:
      "At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.",
  },
  {
    question: "Et harum quidem rerum facilis est et expedita distinctio?",
    answer:
      "Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus.",
  },
];

export default function FaqPage() {
  return (
    <main className="responsive-shell px-4 py-10 tablet:px-6 desktop:px-8">
      <h1 className="font-display text-5xl uppercase leading-none text-cookie-brown-dark tablet:text-6xl">
        FAQ
      </h1>

      <div className="mx-auto mt-8 max-w-2xl space-y-3">
        {FAQ_ITEMS.map((item) => (
          <details
            key={item.question}
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
            <p className="mt-3 text-base leading-relaxed text-cookie-brown-dark">{item.answer}</p>
          </details>
        ))}
      </div>
    </main>
  );
}
