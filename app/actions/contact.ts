"use server";

import { render } from "@react-email/render";
import { cookies } from "next/headers";
import { Resend } from "resend";
import { emailFrom, ownerEmail, resendApiKey, turnstileSecretKey } from "@/config/server";
import { whatsappNumber } from "@/config/site";
import ContactMessageEmail from "@/emails/ContactMessageEmail";
import { sendEmail } from "@/lib/email";
import { checkRateLimits, getClientIp, rateLimitKey } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { contactSchema, type ContactFormValues } from "@/lib/validations/contact";

const SUBMISSION_COOKIE = "last_contact";
const COOLDOWN_MS = 60_000;

interface ContactResult {
  success: boolean;
  error?: string;
}

function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

/**
 * Public action - never throws, mirrors app/actions/orders.ts's result-
 * object pattern (see the "Error handling in Server Actions" note in
 * CLAUDE.md).
 *
 * Unlike createOrder, an email send failure here IS a hard failure: a
 * contact message has no database row backing it, the email is the only
 * record of it, so silently swallowing a send error (as updateOrderStatus
 * does for its status-change emails, where the order itself already
 * persisted) would just lose the message with no trace.
 */
export async function submitContactMessage(
  rawValues: ContactFormValues,
  turnstileToken?: string
): Promise<ContactResult> {
  // Honeypot: real visitors never see or fill this hidden field (see
  // components/features/ContactForm.tsx). A bot that fills every field it
  // finds trips this - return a fake success so it gets no signal it was
  // caught, rather than a validation error it could learn to work around.
  if (rawValues.website) {
    return { success: true };
  }

  const cookieStore = cookies();
  const lastSubmission = cookieStore.get(SUBMISSION_COOKIE)?.value;
  const now = Date.now();

  if (lastSubmission) {
    const elapsed = now - Number(lastSubmission);
    if (Number.isFinite(elapsed) && elapsed < COOLDOWN_MS) {
      return {
        success: false,
        error: "Please wait a moment before sending another message.",
      };
    }
  }

  const parsed = contactSchema.safeParse({
    ...rawValues,
    email: rawValues.email.trim(),
    message: stripHtmlTags(rawValues.message).trim(),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Please check your details and try again.",
    };
  }

  const { email, message } = parsed.data;

  // Bot check and a per-connection limit (audit 2026-11 B-11): the cookie
  // above is ignored by any script, and every message spends the same
  // Resend quota as order emails.
  const clientIp = getClientIp();
  const isHuman = await verifyTurnstile({
    secret: turnstileSecretKey,
    token: turnstileToken,
    ip: clientIp,
  });
  if (!isHuman) {
    return {
      success: false,
      error: "We couldn't confirm you're not a bot. Please try again, or message us on WhatsApp.",
    };
  }

  const withinLimit = await checkRateLimits([
    { key: rateLimitKey("contact-ip", clientIp), window: "1 hour", max: 3 },
  ]);
  if (!withinLimit) {
    return {
      success: false,
      error: "You've sent several messages recently. Please message us on WhatsApp instead.",
    };
  }

  let sent = false;
  try {
    const resend = new Resend(resendApiKey);
    const emailElement = ContactMessageEmail({ customerEmail: email, message, whatsappNumber });
    // Both rendered from the same element - an HTML-only send (no text
    // alternative) costs spam-score points on its own.
    const [html, text] = await Promise.all([
      render(emailElement),
      render(emailElement, { plainText: true }),
    ]);

    // sendEmail checks Resend's resolved `error` too - the SDK doesn't
    // throw on API errors, so a try/catch alone used to report success
    // for a message that was never delivered (audit B-1).
    sent = await sendEmail(
      resend,
      {
        from: emailFrom,
        to: ownerEmail,
        replyTo: email,
        subject: "New Contact Message - One Crunch Lady",
        html,
        text,
      },
      "contact"
    );
  } catch (error) {
    console.error("[email:contact] rendering failed", error);
  }

  if (!sent) {
    return {
      success: false,
      error:
        "We could not send your message right now. Please try again, or reach us directly on WhatsApp.",
    };
  }

  // Written only on confirmed success, not preemptively before the send
  // attempt: cookies().set() inside a Server Action makes Next.js
  // auto-refresh the calling route afterward, which can reset a still-
  // mounted Client Component's state (see app/actions/promo.ts's doc
  // comment for the confirmed case of this on /cart). Writing it here
  // means a failed send - where the form is still visible and the
  // customer needs their typed message intact to retry - never triggers
  // that refresh. It's also more correct: a message that failed to send
  // never reached the owner's inbox, so it shouldn't count against the
  // cooldown either.
  cookieStore.set(SUBMISSION_COOKIE, String(now), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60,
  });

  return { success: true };
}
