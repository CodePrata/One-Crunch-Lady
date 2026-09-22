import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Story",
  description: "How One Crunch Lady started - family grit, midnight baking, and bold flavor.",
};

export default function StoryPage() {
  return (
    <main className="responsive-shell px-4 py-10 tablet:px-6 desktop:px-8">
      <h1 className="font-display text-5xl uppercase leading-none text-cookie-brown-dark tablet:text-6xl">
        Our Story
      </h1>

      <div className="mx-auto mt-8 max-w-2xl">
        <div className="relative rounded-2xl border-[4px] border-cookie-brown bg-flour-white p-6 shadow-[8px_8px_0_0_#8D6E63] [transform:rotate(-1deg)] tablet:p-8">
          <div className="rounded-xl border-[3px] border-cookie-brown bg-hero-yellow/30 p-5 [transform:skew(-1deg)]">
            <p className="font-display text-4xl uppercase text-cookie-brown-dark">Origin Story</p>
            <p className="mt-3 text-base font-medium leading-relaxed text-cookie-brown-dark tablet:text-lg">
              One Crunch Lady began as a kitchen experiment powered by family grit, midnight
              baking sessions, and a dream to turn every bite into a bold memory.
            </p>
            <p className="mt-3 text-base font-medium leading-relaxed text-cookie-brown-dark tablet:text-lg">
              Every batch is still baked fresh to order - no warehouse, no shortcuts, just the
              same crunchy-edge, soft-centre cookies that started it all.
            </p>
            <span className="mt-5 block text-base font-bold leading-relaxed text-cookie-brown-dark tablet:text-lg">
              Baked with Mom Strength
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
