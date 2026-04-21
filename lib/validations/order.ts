import { z } from "zod";

const singaporePhoneRegex = /^(?:\+65)?[89]\d{7}$/;

export const orderSchema = z.object({
  customerName: z
    .string()
    .min(2, "Name must be at least 2 characters.")
    .trim(),
  customerEmail: z.string().email("Please enter a valid email address."),
  customerPhone: z
    .string()
    .regex(
      singaporePhoneRegex,
      "Phone must be a valid Singapore number (+65 optional, starts with 8 or 9, and 8 digits)."
    ),
  quantities: z
    .record(z.string(), z.number().int().min(0).max(10))
    .refine(
      (quantities) => Object.values(quantities).some((quantity) => quantity > 0),
      "Please select at least 1 item."
    ),
  paymentAcknowledged: z.boolean().refine((value) => value === true, {
    message:
      "You must acknowledge PayNow payment confirmation before submitting.",
  }),
  idempotencyToken: z.string().uuid(),
});

export type OrderFormValues = z.infer<typeof orderSchema>;
