import "server-only";
import { z } from "zod";
import { resolvePayNowProxy } from "@/lib/paynow";

// Server-only configuration, validated once at module load. Importing
// this from a Client Component fails the build (the `server-only`
// package throws), which is the point: none of these values - the
// PayNow number, the owner's inbox, the Resend key, the sender address -
// may ever reach the browser bundle. Public values belong in
// `config/site.ts` instead.
//
// Every field here is mandatory: a deploy missing one of these fails at
// boot with a readable error rather than silently degrading (no PayNow
// QR, no owner alert, no transactional email) once customers are already
// placing orders.

const serverEnvSchema = z.object({
  PAYNOW_NUMBER: z
    .string()
    .min(1, "PAYNOW_NUMBER is required to render the PayNow QR code and payment instructions.")
    .refine((value) => resolvePayNowProxy(value) !== null, {
      message:
        "PAYNOW_NUMBER must be a valid Singapore mobile number (8/9XXXXXXX, optionally " +
        "+65/65-prefixed) or a valid UEN (see lib/paynow.ts normalizeUen) - a value that " +
        "doesn't match either silently produces no PayNow QR code on every order.",
    }),
  OWNER_EMAIL: z
    .string()
    .email("OWNER_EMAIL must be a valid email address (it receives new-order alerts)."),
  RESEND_API_KEY: z
    .string()
    .min(1, "RESEND_API_KEY is required to send transactional email via Resend."),
  EMAIL_FROM: z
    .string()
    .min(1, "EMAIL_FROM is required as the Resend sender address for all outgoing email."),
  // PDPA requires a designated Data Protection Officer with published
  // business contact info - WhatsApp alone does not satisfy that
  // requirement. The PDPC does not require the DPO's personal name to be
  // published, only a reachable contact (see dpoName in config/site.ts,
  // a role label, not a person's name) - so only the email varies by
  // deploy and needs to be an env var; the label doesn't.
  DPO_EMAIL: z
    .string()
    .email("DPO_EMAIL must be a valid email address (the published PDPA contact)."),
  // Cloudflare Turnstile secret - checkout and the contact form verify
  // the visitor's Turnstile token with it (lib/turnstile.ts).
  TURNSTILE_SECRET_KEY: z
    .string()
    .min(1, "TURNSTILE_SECRET_KEY is required to verify the bot check on checkout and contact."),
  // Signs admin image uploads (app/actions/cloudinary.ts), so the upload
  // preset can be set to Signed and nobody else can upload to the account.
  CLOUDINARY_API_SECRET: z
    .string()
    .min(1, "CLOUDINARY_API_SECRET is required to sign admin image uploads."),
  // The two public halves are checked here too: without the site key the
  // Turnstile widget never renders, so every order would be refused; without
  // the API key the upload widget refuses to open. Failing the build is
  // better than either of those surfacing on the live site.
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_TURNSTILE_SITE_KEY is required, or no customer can check out."),
  NEXT_PUBLIC_CLOUDINARY_API_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_CLOUDINARY_API_KEY is required for signed admin image uploads."),
});

const parsed = serverEnvSchema.safeParse({
  PAYNOW_NUMBER: process.env.PAYNOW_NUMBER,
  OWNER_EMAIL: process.env.OWNER_EMAIL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  DPO_EMAIL: process.env.DPO_EMAIL,
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  NEXT_PUBLIC_CLOUDINARY_API_KEY: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
});

if (!parsed.success) {
  const issues = parsed.error.issues.map(
    (issue) => `  - ${issue.path.join(".")}: ${issue.message}`
  );
  throw new Error(`Invalid or missing server environment variables:\n${issues.join("\n")}`);
}

export const paynowNumber = parsed.data.PAYNOW_NUMBER;
export const ownerEmail = parsed.data.OWNER_EMAIL;
export const resendApiKey = parsed.data.RESEND_API_KEY;
export const emailFrom = parsed.data.EMAIL_FROM;
export const dpoEmail = parsed.data.DPO_EMAIL;
export const turnstileSecretKey = parsed.data.TURNSTILE_SECRET_KEY;
export const cloudinaryApiSecret = parsed.data.CLOUDINARY_API_SECRET;
