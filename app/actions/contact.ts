"use server";

import { render } from "@react-email/render";
import { cookies } from "next/headers";
import { Resend } from "resend";
import { emailFrom, ownerEmail, resendApiKey } from "@/config/server";
import { whatsappNumber } from "@/config/site";
import ContactMessageEmail from "@/emails/ContactMessageEmail";
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
 * CLAUDE.md) rather than admin.ts's throw-on-failure style.
 *
 * Unlike createOrder, an email send failure here IS a hard failure: a
 * contact message has no database row backing it, the email is the only
 * record of it, so silently swallowing a send error (as updateOrderStatus
 * does for its status-change emails, where the order itself already
 * persisted) would just lose the message with no trace.
 */
export async function submitContactMessage(rawValues: ContactFormValues): Promise<ContactResult> {
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

  try {
    const resend = new Resend(resendApiKey);
    const emailElement = ContactMessageEmail({ customerEmail: email, message, whatsappNumber });
    // Both rendered from the same element - an HTML-only send (no text
    // alternative) costs spam-score points on its own.
    const [html, text] = await Promise.all([
      render(emailElement),
      render(emailElement, { plainText: true }),
    ]);

    await resend.emails.send({
      from: emailFrom,
      to: ownerEmail,
      replyTo: email,
      subject: "New Contact Message - One Crunch Lady",
      html,
      text,
    });
  } catch (error) {
    console.error("Failed to send contact message email", error);
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
