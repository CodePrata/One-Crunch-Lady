import { z } from "zod";

const singaporePhoneRegex = /^(?:\+65)?[89]\d{7}$/;

export const orderSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters.").trim(),
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
    message: "You must acknowledge PayNow payment confirmation before submitting.",
  }),
  idempotencyToken: z.string().uuid(),
  // Optional - not validated for shape here beyond a length cap; the
  // code itself (active, within its date window, under its redemption
  // cap, subtotal met) is only ever verified server-side in createOrder
  // via app/actions/promo.ts's checkPromoCode, the same way prices are
  // never trusted from the client.
  promoCode: z.string().trim().max(32).optional(),
});

export type OrderFormValues = z.infer<typeof orderSchema>;

// Just the contact + consent fields, for forms (like the cart drawer's
// checkout) where quantities come from elsewhere (the cart store) rather
// than from a form field bound to react-hook-form.
export const checkoutContactSchema = orderSchema.pick({
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  paymentAcknowledged: true,
});

export type CheckoutContactValues = z.infer<typeof checkoutContactSchema>;
