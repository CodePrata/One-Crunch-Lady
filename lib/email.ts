import "server-only";
import type { CreateEmailOptions, Resend } from "resend";

/**
 * The one way this app sends an email (audit 2026-11 B-1).
 *
 * The Resend SDK does NOT throw on API errors - invalid sender, unverified
 * domain, quota exhausted, suppressed recipient all come back as a
 * resolved `{ data: null, error }`. Every call site used to wrap
 * `resend.emails.send()` in try/catch only, so those failures were
 * silently treated as success. This checks both paths.
 *
 * Never throws. Returns whether Resend accepted the email; callers decide
 * whether a failure is fatal (the contact form) or log-only (order and
 * status emails, where the order itself is already saved).
 *
 * `context` ends up in the log line so a failure can be traced to an
 * order in Netlify's function logs, e.g. "customer order=OCL-2611-0042".
 */
export async function sendEmail(
  resend: Resend,
  payload: CreateEmailOptions,
  context: string
): Promise<boolean> {
  try {
    const { error } = await resend.emails.send(payload);
    if (error) {
      console.error(`[email:${context}] Resend rejected the email`, error);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[email:${context}] sending threw`, error);
    return false;
  }
}
