import { z } from "zod";
import { isValidImageUrl } from "@/lib/validations/product";

export const brandingSlotSchema = z.enum(["mascot", "wordmark"]);

export type BrandingSlot = z.infer<typeof brandingSlotSchema>;

const imageSizeMessage = "Couldn't read the image size - please upload it again.";

// snake_case to match app/actions/admin.ts's payloads, which map straight
// onto site_branding's header_<slot>_* columns.
export const brandingImageSchema = z.object({
  image_url: z
    .string()
    .trim()
    .min(1, "Please upload an image.")
    .refine(isValidImageUrl, {
      message: "Image URL must be a https://res.cloudinary.com URL.",
    }),
  // Required, unlike banners: the header sizes each image from its real
  // aspect ratio (see migration 017's check constraints).
  image_width: z.number({ error: imageSizeMessage }).int().positive(imageSizeMessage),
  image_height: z.number({ error: imageSizeMessage }).int().positive(imageSizeMessage),
});

export type BrandingImageInput = z.infer<typeof brandingImageSchema>;
