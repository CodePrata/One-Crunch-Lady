import CartBubble from "@/components/features/CartBubble";
import { CartCatalogProvider } from "@/components/features/CartCatalogProvider";
import CartDrawer from "@/components/features/CartDrawer";
import CartToast from "@/components/features/CartToast";
import ProductCatalog from "@/components/features/ProductCatalog";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  image_url: string | null;
  category: string | null;
  ingredients: string | null;
  is_available: boolean;
}

function parseIngredients(ingredients: string | null): string[] {
  if (!ingredients) {
    return [];
  }

  return ingredients
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function Home() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id,name,slug,description,price,image_url,category,ingredients,is_available,created_at")
    .eq("is_available", true)
    .order("created_at", { ascending: false });

  if (error) {
    // Full detail stays server-side; app/error.tsx only ever shows the
    // customer a generic message plus the digest, never this text.
    console.error("Failed to load products", error);
    throw new Error("Failed to load products.");
  }

  const products = (data ?? []) as ProductRow[];
  // One shared, fully-hydrated shape for the cart (drawer + bubble, which
  // now owns checkout) and the catalog grid - each reads only the fields
  // it needs. Page is revalidated every 60s (or immediately by admin
  // mutations via revalidatePath), so prices/availability are never more
  // than a minute stale.
  const catalogProducts = products.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    imageUrl: product.image_url,
    category: product.category,
    ingredients: parseIngredients(product.ingredients),
    isAvailable: product.is_available,
  }));

  return (
    <CartCatalogProvider products={catalogProducts}>
      <main>
        <section className="pt-8 tablet:pt-12">
          <div className="responsive-shell px-4 tablet:px-6 desktop:px-8">
            <div className="hero-sunburst impact-border relative overflow-hidden rounded-2xl p-6 tablet:p-10">
              <div className="relative z-10">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cookie-brown-dark">
                  One Crunch Lady
                </p>
                <h1 className="mt-3 font-display text-5xl uppercase leading-[0.95] text-cookie-brown-dark mobile:text-6xl tablet:text-7xl desktop:text-8xl">
                  One Crunch Is All It Takes.
                </h1>
                <p className="mt-4 max-w-2xl text-base text-cookie-brown-dark tablet:text-lg">
                  Fresh-baked cookies with manga-level impact: crunchy edges, soft centers, and
                  unforgettable flavor.
                </p>
                <a
                  href="#origin-story"
                  className="tap-target mt-6 inline-flex items-center justify-center rounded-md border-[3px] border-cookie-brown bg-power-red px-6 text-base font-semibold text-flour-white"
                >
                  Our Story
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="origin-story" className="pt-10 tablet:pt-14 scroll-mt-20">
          <div className="responsive-shell px-4 tablet:px-6 desktop:px-8">
            <div className="relative rounded-2xl border-[4px] border-cookie-brown bg-flour-white p-6 shadow-[8px_8px_0_0_#8D6E63] [transform:rotate(-1deg)] tablet:p-8">
              <div className="rounded-xl border-[3px] border-cookie-brown bg-hero-yellow/30 p-5 [transform:skew(-1deg)]">
                <p className="font-display text-4xl uppercase text-cookie-brown-dark">Origin Story</p>
                <p className="mt-3 text-base font-medium leading-relaxed text-cookie-brown-dark tablet:text-lg">
                  One Crunch Lady began as a kitchen experiment powered by family grit, midnight
                  baking sessions, and a dream to turn every bite into a bold memory.
                </p>
                <span className="mt-5 text-base font-bold leading-relaxed text-cookie-brown-dark tablet:text-lg">
                  Baked with Mom Strength
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="pt-10 tablet:pt-14">
          <div className="responsive-shell px-4 pb-16 tablet:px-6 desktop:px-8">
            <div className="mb-5 flex items-end justify-between gap-3">
              <h2 className="font-display text-4xl uppercase text-cookie-brown-dark tablet:text-5xl">
                Flavours
              </h2>
              <p className="text-sm font-semibold uppercase tracking-wide text-cookie-brown-dark">
                Fresh Batch
              </p>
            </div>

            <ProductCatalog products={catalogProducts} />
          </div>
        </section>
      </main>
      <CartBubble />
      <CartDrawer />
      <CartToast />
    </CartCatalogProvider>
  );
}
