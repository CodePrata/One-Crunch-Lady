import { z } from "zod";

export const contactSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  message: z
    .string()
    .trim()
    .min(10, "Tell us a bit more - at least 10 characters.")
    .max(2000, "Message is too long (max 2000 characters)."),
  // Honeypot: a hidden field real visitors never see or fill (see
  // components/features/ContactForm.tsx). A bot that fills every field
  // it finds trips this; app/actions/contact.ts checks it separately
  // from this schema so a caught bot gets a generic fake-success
  // response instead of a validation error that would tip it off.
  website: z.string().max(0, "Spam detected."),
});

export type ContactFormValues = z.infer<typeof contactSchema>;
