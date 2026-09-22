import CartBubble from "@/components/features/CartBubble";
import { CartCatalogProvider } from "@/components/features/CartCatalogProvider";
import CartDrawer from "@/components/features/CartDrawer";
import CartToast from "@/components/features/CartToast";
import IntroLanding from "@/components/features/IntroLanding";
import { getCatalogProducts } from "@/lib/products";

/**
 * Scoped to the storefront route group only - deliberately NOT in the
 * true root layout (app/layout.tsx): that wraps every route, including
 * /admin/*, /privacy, and /order/success/*, none of which should ever
 * show a storefront entry gate or the cart UI.
 *
 * Owns the cart shell (catalog provider + bubble + drawer + toast) so
 * every page under (storefront) - not just "/" - has a working cart. A
 * single cached getCatalogProducts() call here serves both the cart UI
 * and, via its own separate call (same cache entry, no extra query),
 * each page's own product rendering.
 *
 * Fully static: the splash gate's dismissed/not-dismissed state lives in
 * localStorage (read client-side by IntroLanding itself), not a
 * server-read cookie - see the doc comment there. That's what lets this
 * layout, and therefore every page under (storefront), render as
 * static/ISR instead of being forced dynamic by a per-request cookies()
 * read. Because the route is static, this layout's own async data fetch
 * below resolves once at build/revalidation time, not per visitor - it
 * does not reintroduce a loading-skeleton flash in front of the gate.
 */
export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const products = await getCatalogProducts();

  return (
    <IntroLanding>
      <CartCatalogProvider products={products}>
        {children}
        <CartBubble />
        <CartDrawer />
        <CartToast />
      </CartCatalogProvider>
    </IntroLanding>
  );
}
