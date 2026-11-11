const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface SiteverifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

interface VerifyTurnstileOptions {
  secret: string;
  token: string | undefined;
  ip?: string;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
}

/**
 * Checks a Cloudflare Turnstile token server-side (audit 2026-11 S-1 /
 * B-11). Callers pass the secret from config/server.ts; this module has
 * no server-only import so it can be unit-tested.
 *
 * - No token, or Cloudflare says the token is bad: false (blocked).
 * - Cloudflare unreachable or erroring (network failure, 5xx): true, with
 *   an error logged. A visitor can't cause that, so failing open there
 *   only matters during a Cloudflare outage, when blocking every real
 *   customer would be worse than letting a few bots through.
 */
export async function verifyTurnstile({
  secret,
  token,
  ip,
  fetchImpl = fetch,
}: VerifyTurnstileOptions): Promise<boolean> {
  if (!token) {
    return false;
  }

  const body = new URLSearchParams({ secret, response: token });
  if (ip && ip !== "unknown") {
    body.set("remoteip", ip);
  }

  try {
    const response = await fetchImpl(SITEVERIFY_URL, {
      method: "POST",
      body,
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`[turnstile] siteverify returned HTTP ${response.status}; allowing request`);
      return true;
    }

    const result = (await response.json()) as SiteverifyResponse;
    if (!result.success) {
      console.warn("[turnstile] token rejected", result["error-codes"]);
    }
    return result.success === true;
  } catch (error) {
    console.error("[turnstile] siteverify unreachable; allowing request", error);
    return true;
  }
}
