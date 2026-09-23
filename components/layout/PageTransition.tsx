"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Fades + slightly rises page content in on navigation. Meant to be used
 * from a template.tsx (app/(storefront)/template.tsx, app/(legal)/template.tsx),
 * never a layout.tsx - that distinction is load-bearing here, not
 * cosmetic. A layout.tsx persists across navigations within it, so
 * detecting "the route changed" required tracking usePathname() and
 * keying an AnimatePresence child by it - which visibly flashed the new
 * page at full opacity for a frame before the animation caught up,
 * because usePathname() updates on a later tick than Next's own content
 * swap. template.tsx remounts fresh as part of Next's own render commit
 * for every navigation, so this component's `initial` state is already
 * in place before anything paints - no separate change-detection step,
 * no race, no flash. That also means no AnimatePresence/exit animation
 * here: the old page's DOM is simply replaced as part of the same
 * render, which reads fine for a fade-and-rise this quick (~0.28s).
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
