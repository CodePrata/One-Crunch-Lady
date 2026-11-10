import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Story",
  description:
    "How One Crunch Lady started - a mum's home kitchen, small-batch baking, and less-sweet treats made with heart.",
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
            <h2 className="font-display text-3xl uppercase leading-tight text-cookie-brown-dark tablet:text-4xl">
              Born from a Mother’s Grit, Baked with Heart
            </h2>
            <p className="mt-3 text-base font-medium leading-relaxed text-cookie-brown-dark tablet:text-lg">
              One Crunch Lady began in a home kitchen, with a mum, a passion for baking, and a dream
              to create something meaningful from the simplest of beginnings.
            </p>
            <p className="mt-3 text-base font-medium leading-relaxed text-cookie-brown-dark tablet:text-lg">
              What started with late-night baking experiments and batches shared with family and
              friends slowly grew into a love for creating delicious treats with a little more
              thought behind every ingredient.
            </p>
            <p className="mt-3 text-base font-medium leading-relaxed text-cookie-brown-dark tablet:text-lg">
              From our signature crunchy cookies to less-sweet, protein-rich and better-for-you
              creations, we believe indulgence doesn’t always have to mean overly sweet. We
              carefully explore wholesome ingredients and balanced flavours to create treats that
              you can enjoy and feel good about.
            </p>
            <p className="mt-3 text-base font-medium leading-relaxed text-cookie-brown-dark tablet:text-lg">
              Our cakes follow the same philosophy — less sweet, thoughtfully crafted and made with
              quality ingredients, including premium, vegan and gluten-free options where possible.
            </p>
            <p className="mt-3 text-base font-medium leading-relaxed text-cookie-brown-dark tablet:text-lg">
              Every batch is still small-batch, handmade and freshly baked to order. No shortcuts,
              just honest ingredients, careful baking and plenty of heart.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
