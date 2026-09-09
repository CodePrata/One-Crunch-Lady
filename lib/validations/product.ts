import { z } from "zod";

const CLOUDINARY_HOST = "res.cloudinary.com";

// Mirrors getOptimizedImage()'s CASE 1 (lib/cloudinary.ts) and the only
// remote pattern allowed in next.config.mjs - the admin upload widget
// always returns a full https://res.cloudinary.com secure_url, so a blank
// value (no image yet) is the only other accepted shape.
function isValidImageUrl(value: string): boolean {
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
  category: z.string().trim().max(60, "Category must be 60 characters or fewer."),
  ingredients: z.string().trim().min(1, "Please list at least one ingredient."),
});

export type ProductFormValues = z.infer<typeof productSchema>;
