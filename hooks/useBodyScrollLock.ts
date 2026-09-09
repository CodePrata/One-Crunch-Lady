"use client";

import { useEffect } from "react";

let lockCount = 0;
let previousOverflow: string | null = null;

/**
 * Reference-counted document.body scroll lock. Safe to use from multiple
 * overlays mounted at once (e.g. the product detail modal opened while the
 * cart drawer is also open) - the lock only releases once every caller has
 * unmounted or set `locked` to false, so the first overlay to close doesn't
 * re-enable scrolling out from under a still-open second overlay.
 */
export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) {
      return;
    }

    if (lockCount === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = previousOverflow ?? "";
        previousOverflow = null;
      }
    };
  }, [locked]);
}
