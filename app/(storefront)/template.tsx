import PageTransition from "@/components/layout/PageTransition";

/**
 * template.tsx, not layout.tsx - see PageTransition's doc comment for
 * why that distinction matters here. The cart shell and IntroLanding
 * stay in layout.tsx (app/(storefront)/layout.tsx) so they persist
 * across navigations; only page content passes through here.
 */
export default function StorefrontTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
