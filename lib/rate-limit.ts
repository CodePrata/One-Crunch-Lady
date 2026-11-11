import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * The visitor's IP as Netlify reports it. x-nf-client-connection-ip is
 * set by Netlify's edge and can't be spoofed by the client; the
 * x-forwarded-for fallback is for local dev and other hosts.
 */
export function getClientIp(): string {
  const requestHeaders = headers();
  return (
    requestHeaders.get("x-nf-client-connection-ip") ??
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/**
 * A rate-limit key: "<scope>:<sha256 of the value>". Hashed so the
 * rate_limits table never stores a raw IP or email address.
 */
export function rateLimitKey(scope: string, value: string): string {
  return `${scope}:${createHash("sha256").update(value.trim().toLowerCase()).digest("hex")}`;
}

export interface RateLimitRule {
  key: string;
  /** Postgres interval, e.g. "1 hour", "1 day". */
  window: string;
  max: number;
}

/**
 * Counts one hit against every rule (migration 021's hit_rate_limit) and
 * returns false if any of them is over its limit.
 *
 * Fails OPEN: if the database call itself errors, the request is allowed
 * and the error logged, so a problem with the limiter never blocks a real
 * customer's order.
 */
export async function checkRateLimits(rules: RateLimitRule[]): Promise<boolean> {
  const supabase = supabaseAdmin();

  const results = await Promise.all(
    rules.map(async (rule) => {
      const { data, error } = await supabase.rpc("hit_rate_limit", {
        p_key: rule.key,
        p_window: rule.window,
        p_max: rule.max,
      });
      if (error) {
        console.error(`[rate-limit] check failed for ${rule.key.split(":")[0]}`, error);
        return true;
      }
      return data !== false;
    })
  );

  return results.every(Boolean);
}
