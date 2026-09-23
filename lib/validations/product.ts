import { z } from "zod";

const CLOUDINARY_HOST = "res.cloudinary.com";

// Mirrors getOptimizedImage()'s CASE 1 (lib/cloudinary.ts) and the only
// remote pattern allowed in next.config.mjs - the admin upload widget
// always returns a full https://res.cloudinary.com secure_url, so a blank
// value (no image yet) is the only other accepted shape. Exported for
// reuse by lib/validations/banner.ts - the same widget, the same host
// restriction.
export function isValidImageUrl(value: string): boolean {
  if (value === "") {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === CLOUDINARY_HOST;
  } catch {
    return false;
  }
}

// snake_case field names to match CreateProductInput/UpdateProductInput in
// app/actions/admin.ts, which mirror the products table shape rather than
// types/models.ts (see CLAUDE.md's naming-boundary note).
export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(120, "Name must be 120 characters or fewer."),
  description: z
    .string()
    .trim()
    .min(3, "Description must be at least 3 characters.")
    .max(2000, "Description must be 2000 characters or fewer."),
  price: z
    .number()
    .finite("Price must be a valid number.")
    .positive("Price must be greater than 0.")
    .max(1000, "Price must be $1,000 or less."),
  image_url: z.string().trim().refine(isValidImageUrl, {
    message: "Image URL must be a https://res.cloudinary.com URL.",
  }),
  // Was max(60) - the DB check constraint (008_add_category_to_products.sql)
  // caps at 40, so a 41-60 char category previously passed this schema and
  // failed at the database with a raw constraint-violation error.
  category: z.string().trim().max(40, "Category must be 40 characters or fewer."),
  ingredients: z.string().trim().min(1, "Please list at least one ingredient."),
});

export type ProductFormValues = z.infer<typeof productSchema>;

// snake_case to match app/actions/admin.ts's setProductDiscount() payload,
// which mirrors the products table shape for a direct .update() call.
// discount_value's upper bound for PERCENT and its "less than price"
// requirement for FIXED are enforced by the DB check constraint
// (012_add_product_discounts.sql) as the final backstop; setProductDiscount
// additionally checks the FIXED case against the product's current price
// before writing, for a friendlier error than a raw constraint violation.
export const productDiscountSchema = z.object({
  discount_type: z.enum(["PERCENT", "FIXED"], {
    message: "Choose a discount type.",
  }),
  discount_value: z
    .number()
    .finite("Discount must be a valid number.")
    .positive("Discount must be greater than 0."),
});

export type ProductDiscountFormValues = z.infer<typeof productDiscountSchema>;
