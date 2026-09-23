import { z } from "zod";

// snake_case to match app/actions/admin.ts's createPromoCode payload,
// which mirrors the promo_codes table shape for a direct insert.
export const promoCodeSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "Code must be at least 3 characters.")
      .max(32, "Code must be 32 characters or fewer.")
      .regex(/^[A-Za-z0-9_-]+$/, "Code can only contain letters, numbers, hyphens, and underscores."),
    discount_type: z.enum(["PERCENT", "FIXED"], {
      message: "Choose a discount type.",
    }),
    discount_value: z
      .number()
      .finite("Discount must be a valid number.")
      .positive("Discount must be greater than 0."),
    min_subtotal: z.number().finite().nonnegative().optional(),
    max_redemptions: z.number().int().positive().optional(),
    // Raw datetime-local input strings (or omitted) - kept as strings
    // through validation and converted to timestamps only at the DB
    // write (app/actions/admin.ts's createPromoCode), same as how
    // image_url/category empty-string-to-null conversions are handled
    // elsewhere rather than inside the schema.
    starts_at: z.string().optional(),
    expires_at: z.string().optional(),
  })
  // The DB check constraint (015_create_promo_codes.sql) enforces this
  // too - this is just a friendlier message than the raw constraint
  // violation would be, matching the same pattern setProductDiscount
  // uses for a FIXED discount vs. price.
  .refine((data) => data.discount_type !== "PERCENT" || data.discount_value <= 100, {
    message: "Percentage discount must be 100 or less.",
    path: ["discount_value"],
  });

export type PromoCodeFormValues = z.infer<typeof promoCodeSchema>;
