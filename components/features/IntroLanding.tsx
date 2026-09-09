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

// Read server-side (see app/page.tsx) so a returning visitor's initial
// HTML skips the gate entirely - not just quickly, but never rendered.
export const SPLASH_DISMISSED_COOKIE = "splash_dismissed";
const SPLASH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

function markSplashDismissed() {
  try {
    document.cookie = `${SPLASH_DISMISSED_COOKIE}=true; path=/; max-age=${SPLASH_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  } catch {
    // document.cookie can throw in locked-down privacy contexts - harmless
    // to skip; worst case the gate just replays on the next visit.
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
 * The one exception is `prefers-reduced-motion`: the gate's entire value
 * is the animated flourish, so a reduced-motion visitor skips it outright
 * and lands directly on the real content - forcing an extra required
 * click through a purely decorative screen would be an accessibility
 * regression, not a feature.
 */
export default function IntroLanding({
  children,
  hasDismissedSplash = false,
}: {
  children: React.ReactNode;
  /** From the server-read `splash_dismissed` cookie - see app/page.tsx. */
  hasDismissedSplash?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(hasDismissedSplash ? "revealed" : "gate");
  const ctaRef = useRef<HTMLButtonElement>(null);

  useBodyScrollLock(phase !== "revealed");

  useEffect(() => {
    if (hasDismissedSplash) {
      return;
    }
    if (reduceMotion) {
      markSplashDismissed();
      setPhase("revealed");
      return;
    }
    ctaRef.current?.focus();
  }, [reduceMotion, hasDismissedSplash]);

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
            <Image
              src="/ocl_logo-nobg.png"
              alt="One Crunch Lady"
              width={224}
              height={224}
              className="h-56 w-56 object-contain"
              priority
            />
          </motion.div>

          <motion.p
            className="relative mt-5 max-w-xs px-4 text-center font-display text-3xl uppercase leading-none text-cookie-brown tablet:text-4xl"
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
        aria-hidden={phase !== "revealed"}
        // `false` for a returning visitor (hasDismissedSplash): render
        // already at the "animate" resting state with no enter transition
        // at all, since there's no gate to reveal from - otherwise this
        // would still fade/slide in on every load despite never gating.
        initial={hasDismissedSplash ? false : { opacity: 0, y: 40 }}
        animate={phase === "revealed" ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className={phase !== "revealed" ? "pointer-events-none" : undefined}
      >
        {children}
      </motion.div>
    </>
  );
}
