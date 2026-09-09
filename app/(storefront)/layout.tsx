import { cookies } from "next/headers";
import IntroLanding, { SPLASH_DISMISSED_COOKIE } from "@/components/features/IntroLanding";

/**
 * Scoped to the storefront route group only - this layout, and therefore
 * the splash gate, sits ABOVE this segment's own loading.tsx/Suspense
 * boundary (page.tsx is an async Server Component). That's the actual
 * fix for the flash: a gate placed inside page.tsx is still swapped in
 * only once that async boundary resolves, so the loading skeleton (or a
 * flash of real content) can render first. A gate one level up, in a
 * synchronous layout, is present in the very first HTML the browser
 * receives, before the page below it has to resolve anything.
 *
 * Deliberately NOT in the true root layout (app/layout.tsx): that wraps
 * every route, including /admin/*, /privacy, and /order/success/*, none
 * of which should ever show a storefront entry gate.
 */
export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const hasDismissedSplash = cookies().get(SPLASH_DISMISSED_COOKIE)?.value === "true";

  return <IntroLanding hasDismissedSplash={hasDismissedSplash}>{children}</IntroLanding>;
}
