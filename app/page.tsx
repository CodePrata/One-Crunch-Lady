import OrderForm from "@/components/features/OrderForm";
import ProductCard from "@/components/features/ProductCard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  image_url: string | null;
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
  const paynowNumber = process.env.PAYNOW_NUMBER;
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const { data, error } = await supabase
    .from("products")
    .select(
      "id,name,slug,description,price,image_url,ingredients,is_available,created_at"
    )
    .eq("is_available", true)
    .order("created_at", { ascending: false })
    .setHeader('Cache-Control', 'no-cache');

  if (error) {
    throw new Error(`Failed to load products: ${error.message}`);
  }

  const products = (data ?? []) as ProductRow[];
  const orderFormProducts = products.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    isAvailable: product.is_available,
  }));

  return (
    <main>
      <section className="pt-8 tablet:pt-12">
        <div className="responsive-shell px-4 tablet:px-6 desktop:px-8">
          <div className="hero-sunburst impact-border relative overflow-hidden rounded-2xl p-6 tablet:p-10">
            <div className="relative z-10">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cookie-brown">
                One Crunch Lady
              </p>
              <h1 className="mt-3 font-display text-5xl uppercase leading-[0.95] text-cookie-brown mobile:text-6xl tablet:text-7xl desktop:text-8xl">
                One Crunch Is All It Takes.
              </h1>
              <p className="mt-4 max-w-2xl text-base text-cookie-brown tablet:text-lg">
                Fresh-baked cookies with manga-level impact: crunchy edges, soft
                centers, and unforgettable flavor.
              </p>
              <a
                id="order-now"
                href="#order-form"
                className="tap-target mt-6 inline-flex items-center justify-center rounded-lg border-[3px] border-cookie-brown bg-power-red px-6 text-base font-semibold text-flour-white"
              >
                Order Now
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="pt-10 tablet:pt-14">
        <div className="responsive-shell px-4 tablet:px-6 desktop:px-8">
          <div className="relative rounded-2xl border-[4px] border-cookie-brown bg-flour-white p-6 shadow-[8px_8px_0_0_#8D6E63] [transform:rotate(-1deg)] tablet:p-8">
            <div className="rounded-xl border-[3px] border-cookie-brown bg-hero-yellow/30 p-5 [transform:skew(-1deg)]">
              <p className="font-display text-4xl uppercase text-cookie-brown">
                Origin Story
              </p>
              <p className="mt-3 text-base font-medium leading-relaxed text-cookie-brown tablet:text-lg">
                One Crunch Lady began as a kitchen experiment powered by family
                grit, midnight baking sessions, and a dream to turn every bite
                into a bold memory.
              </p>
              <span className="mt-5 text-base font-bold leading-relaxed text-cookie-brown tablet:text-lg">
                Baked with Mom Strength
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="pt-10 tablet:pt-14">
        <div className="responsive-shell px-4 pb-8 tablet:px-6 desktop:px-8">
          <div className="mb-5 flex items-end justify-between gap-3">
            <h2 className="font-display text-4xl uppercase text-cookie-brown tablet:text-5xl">
              Flavors
            </h2>
            <p className="text-sm font-semibold uppercase tracking-wide text-cookie-brown">
              Fresh Batch
            </p>
          </div>

          {products.length === 0 ? (
            <div className="rounded-xl border-2 border-cookie-brown bg-flour-white p-6 text-cookie-brown">
              No products are available right now. Check back soon.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  name={product.name}
                  description={product.description}
                  price={product.price}
                  imageUrl={product.image_url}
                  ingredients={parseIngredients(product.ingredients)}
                  isAvailable={product.is_available}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="pt-10 tablet:pt-14">
        <div className="responsive-shell px-4 pb-10 tablet:px-6 desktop:px-8">
          <OrderForm
            products={orderFormProducts}
            paynowNumber={paynowNumber ?? "PayNow number unavailable"}
            whatsappNumber={whatsappNumber ?? ""}
          />
        </div>
      </section>
    </main>
  );
}
