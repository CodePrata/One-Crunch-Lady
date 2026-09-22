"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

// Hero-yellow, darkened ~10% for the radial burst accent. Derived from the
// brand token rather than an unrelated arbitrary color - there's no
// separate "darker yellow" design token, so this is hand-computed and
// kept local to this one effect.
const BURST_COLOR = "#E6C200";

// Per-browser only - deliberately NOT a cookie. A cookie made the splash
// gate's dismissed/not-dismissed state part of the server-rendered HTML
// (read via cookies() in app/(storefront)/layout.tsx), which forced that
// whole route into per-request dynamic rendering and, on top of that,
// could serve a cached "not dismissed" response to a returning visitor
// with no way for this state to vary per browser once cached. localStorage
// is read client-side only - "/" stays fully static, and a pre-paint
// inline script (app/layout.tsx) checks this same key to avoid a flash of
// the gate before React hydrates. See the CSS override in globals.css.
export const SPLASH_DISMISSED_STORAGE_KEY = "splash_dismissed";

function markSplashDismissed() {
  try {
    localStorage.setItem(SPLASH_DISMISSED_STORAGE_KEY, "true");
  } catch {
    // localStorage can throw in locked-down privacy contexts - harmless
    // to skip; worst case the gate just replays on the next visit.
  }
}

function readSplashDismissed(): boolean {
  try {
    return localStorage.getItem(SPLASH_DISMISSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

type Phase = "gate" | "exiting" | "revealed";

/**
 * Permanent full-screen entry gate. The user lands here - and only here -
 * until they click through; there is no timer and nothing is skipped
 * based on a prior visit. `children` (the real site) stays mounted the
 * whole time (crawlable, no content flash on interaction) but is hidden
 * and inert until revealed, so it can slide/fade into place instead of
 * popping in.
 *
 * Initial phase is always "gate" - identical on server and client, so "/"
 * renders the same static HTML for every visitor (cacheable, no per-request
 * cookie read). A returning visitor's dismissal is applied a moment after
 * mount, once localStorage can be read; the pre-paint script + CSS
 * override (see globals.css) hide the gate and reveal children before
 * that, so there's no visible flash despite the state not being known
 * until the client runs.
 *
 * The other exception is `prefers-reduced-motion`: the gate's entire value
 * is the animated flourish, so a reduced-motion visitor skips it outright
 * and lands directly on the real content - forcing an extra required
 * click through a purely decorative screen would be an accessibility
 * regression, not a feature.
 */
export default function IntroLanding({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("gate");
  const ctaRef = useRef<HTMLButtonElement>(null);

  useBodyScrollLock(phase !== "revealed");

  useEffect(() => {
    if (readSplashDismissed()) {
      setPhase("revealed");
      return;
    }
    if (reduceMotion) {
      markSplashDismissed();
      setPhase("revealed");
      return;
    }
    ctaRef.current?.focus();
  }, [reduceMotion]);

  function handleEnter() {
    if (phase !== "gate") {
      return;
    }
    markSplashDismissed();
    if (reduceMotion) {
      setPhase("revealed");
      return;
    }
    setPhase("exiting");
  }

  return (
    <>
      {phase !== "revealed" ? (
        <div className="z-splash fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-flour-white">
          <div className="absolute inset-0 bg-hero-yellow/35" aria-hidden="true" />

          {/* Persistent backdrop burst: settles into a stable visible state
              on mount rather than dissipating, since this screen is meant
              to hold indefinitely, not play once and vanish. */}
          <motion.div
            className="absolute h-[70vmax] w-[70vmax] rounded-full"
            style={{
              background: `radial-gradient(circle, ${BURST_COLOR} 0%, rgba(230,194,0,0) 70%)`,
            }}
            aria-hidden="true"
            initial={{ scale: 0, opacity: 0 }}
            animate={phase === "exiting" ? { scale: 1.15, opacity: 0 } : { scale: 1, opacity: 0.6 }}
            transition={
              phase === "exiting"
                ? { duration: 0.5, ease: "easeIn" }
                : { duration: 1.1, ease: [0.16, 1, 0.3, 1] }
            }
          />

          {/* Exit-only greyed/faded scrim - cues "this screen is leaving"
              without introducing an off-brand grey; a muted brown wash
              over the yellow backdrop reads as faded rather than bright. */}
          {phase === "exiting" ? (
            <motion.div
              className="absolute inset-0 bg-cookie-brown/50"
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          ) : null}

          <motion.div
            className="relative"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={
              phase === "exiting"
                ? { y: "-120vh", opacity: 0, scale: 1 }
                : { y: 0, opacity: 1, scale: 1 }
            }
            transition={
              phase === "exiting"
                ? { duration: 0.7, ease: [0.4, 0, 1, 1] }
                : { type: "spring", stiffness: 110, damping: 18, mass: 1.4 }
            }
            onAnimationComplete={() => {
              if (phase === "exiting") {
                setPhase("revealed");
              }
            }}
          >
            {/* unoptimized: local /public asset - see the matching comment
                in components/layout/Header.tsx for why. */}
            <Image
              src="/ocl_logo-nobg.png"
              alt="One Crunch Lady"
              width={320}
              height={320}
              unoptimized
              className="h-64 w-64 object-contain tablet:h-80 tablet:w-80"
              priority
            />
          </motion.div>

          <motion.p
            className="relative mt-5 max-w-xs px-4 text-center font-display text-3xl uppercase leading-none text-cookie-brown-dark tablet:text-4xl"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: phase === "exiting" ? 0 : 1, y: 0 }}
            transition={{
              duration: phase === "exiting" ? 0.3 : 0.5,
              delay: phase === "exiting" ? 0 : 0.5,
            }}
          >
            One Crunch Is All It Takes.
          </motion.p>

          <motion.button
            ref={ctaRef}
            type="button"
            onClick={handleEnter}
            className="tap-target relative mt-6 inline-flex items-center justify-center rounded-md border-[3px] border-cookie-brown bg-power-red px-6 text-base font-semibold text-flour-white"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: phase === "exiting" ? 0 : 1, y: 0 }}
            transition={{
              duration: phase === "exiting" ? 0.3 : 0.5,
              delay: phase === "exiting" ? 0 : 0.5,
            }}
          >
            Enter the Bakery
          </motion.button>
        </div>
      ) : null}

      <motion.div
        data-splash-children
        aria-hidden={phase !== "revealed"}
        // Always starts from the same pre-reveal state (matches the
        // "gate" phase both phases start at, server and client alike).
        // For a returning visitor this is masked by the CSS override in
        // globals.css until this effect's setPhase("revealed") catches
        // up a moment after mount - see the component doc comment above.
        initial={{ opacity: 0, y: 40 }}
        animate={phase === "revealed" ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className={phase !== "revealed" ? "pointer-events-none" : undefined}
      >
        {children}
      </motion.div>
    </>
  );
}
