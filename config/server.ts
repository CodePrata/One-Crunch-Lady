import "server-only";
import { z } from "zod";

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
    .min(1, "PAYNOW_NUMBER is required to render the PayNow QR code and payment instructions."),
  OWNER_EMAIL: z
    .string()
    .email("OWNER_EMAIL must be a valid email address (it receives new-order alerts)."),
  RESEND_API_KEY: z
    .string()
    .min(1, "RESEND_API_KEY is required to send transactional email via Resend."),
  EMAIL_FROM: z
    .string()
    .min(1, "EMAIL_FROM is required as the Resend sender address for all outgoing email."),
});

const parsed = serverEnvSchema.safeParse({
  PAYNOW_NUMBER: process.env.PAYNOW_NUMBER,
  OWNER_EMAIL: process.env.OWNER_EMAIL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
});

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`);
  throw new Error(`Invalid or missing server environment variables:\n${issues.join("\n")}`);
}

export const paynowNumber = parsed.data.PAYNOW_NUMBER;
export const ownerEmail = parsed.data.OWNER_EMAIL;
export const resendApiKey = parsed.data.RESEND_API_KEY;
export const emailFrom = parsed.data.EMAIL_FROM;
