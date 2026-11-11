"use client";

import { useEffect, useRef } from "react";
import { turnstileSiteKey } from "@/config/site";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileRenderOptions {
  sitekey: string;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "flexible" | "compact";
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

/** Loads Cloudflare's script once per page, however many widgets mount. */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.turnstile) {
          resolve(window.turnstile);
        } else {
          reject(new Error("Turnstile script loaded without window.turnstile"));
        }
      };
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Turnstile script failed to load"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

interface TurnstileWidgetProps {
  /** Receives a fresh token, or null when it expires or the check errors. */
  onToken: (token: string | null) => void;
  /**
   * Bump this number to get a new token. Tokens are single-use, so
   * forms bump it after every submit attempt.
   */
  resetSignal: number;
}

/**
 * Cloudflare Turnstile bot check (audit 2026-11 S-1 / B-11). Usually
 * invisible ("Managed" mode); now and then it shows a checkbox. Rendered
 * explicitly per instance, because CheckoutForm can be mounted twice at
 * once (cart drawer + /cart page) and the implicit `cf-turnstile` class
 * mode doesn't handle that.
 */
export default function TurnstileWidget({ onToken, resetSignal }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!turnstileSiteKey) {
      return;
    }

    let cancelled = false;

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) {
          return;
        }
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: turnstileSiteKey,
          theme: "light",
          size: "flexible",
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      })
      .catch((error: unknown) => {
        console.error("[turnstile]", error);
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetSignal === 0 || !widgetIdRef.current || !window.turnstile) {
      return;
    }
    onTokenRef.current(null);
    window.turnstile.reset(widgetIdRef.current);
  }, [resetSignal]);

  if (!turnstileSiteKey) {
    return null;
  }

  return <div ref={containerRef} className="min-h-[65px] w-full" />;
}
