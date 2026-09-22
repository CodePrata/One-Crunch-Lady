import type { Metadata } from "next";
import ProductCatalog from "@/components/features/ProductCatalog";
import { getCatalogProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Products",
  description: "Browse every cookie flavour One Crunch Lady has available right now.",
};

// Matches app/(storefront)/page.tsx's convention - see lib/products.ts's
// doc comment for why this and the underlying unstable_cache revalidate
// window are kept in sync.
export const revalidate = 60;

export default async function ProductsPage() {
  const catalogProducts = await getCatalogProducts();

  return (
    <main className="responsive-shell px-4 py-10 tablet:px-6 desktop:px-8">
      <h1 className="font-display text-5xl uppercase leading-none text-cookie-brown-dark tablet:text-6xl">
        Products
      </h1>

      <div className="mt-8">
        <ProductCatalog products={catalogProducts} />
      </div>
    </main>
  );
}
