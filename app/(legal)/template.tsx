import PageTransition from "@/components/layout/PageTransition";

/**
 * Groups /privacy, /terms, /refund (route groups don't affect URLs -
 * each still resolves to its own top-level path) purely so they share
 * this. template.tsx, not layout.tsx - see PageTransition's doc comment
 * for why. These still fall under the root layout's Header/Footer like
 * every other route.
 */
export default function LegalTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
