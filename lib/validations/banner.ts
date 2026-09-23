import { z } from "zod";
import { isValidImageUrl } from "@/lib/validations/product";

// snake_case to match app/actions/admin.ts's banner action payloads,
// which mirror the promotion_banners table shape for a direct insert.
export const bannerSchema = z.object({
  image_url: z
    .string()
    .trim()
    .min(1, "Please upload a banner image.")
    .refine(isValidImageUrl, {
      message: "Image URL must be a https://res.cloudinary.com URL.",
    }),
  alt_text: z
    .string()
    .trim()
    .min(3, "Alt text must be at least 3 characters.")
    .max(200, "Alt text must be 200 characters or fewer."),
  // No .default() here - zodResolver requires a schema's input and
  // output types to match, and .default() makes them diverge (the field
  // becomes optional on input, required on output), which breaks
  // useForm<BannerFormValues>. The fallback to 0 lives in the action
  // instead (app/actions/admin.ts's createBanner).
  sort_order: z.number().int().optional(),
  // Captured from the Cloudinary upload widget's response
  // (CloudinaryImageField's onDimensions callback) at the same moment as
  // image_url, when available - Cloudinary's own SDK types result.info as
  // string | object, so the widget doesn't always hand back width/height.
  // Optional rather than required for exactly that reason: a banner
  // should never fail to create just because dimensions didn't come
  // through. /promotion falls back to a safe, non-cropping display for a
  // banner missing them (app/(storefront)/promotion/page.tsx).
  image_width: z.number().int().positive().optional(),
  image_height: z.number().int().positive().optional(),
});

export type BannerFormValues = z.infer<typeof bannerSchema>;
