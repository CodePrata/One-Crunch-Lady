"use client";

import { CldUploadWidget } from "next-cloudinary";

interface CloudinaryImageFieldProps {
  value: string;
  onChange: (url: string) => void;
  buttonLabel: string;
  selectedLabel?: string;
  emptyLabel?: string;
  /**
   * Optional: receives the uploaded image's real pixel width/height from
   * the same Cloudinary response as onChange. Only the banner form uses
   * this today (see AdminBannersPanel) - it needs real dimensions so
   * /promotion can render each banner at its own aspect ratio instead of
   * cropping it into a fixed box. Product images don't need this: their
   * cards render at a fixed 4:3 with object-cover by design.
   */
  onDimensions?: (width: number, height: number) => void;
}

/**
 * Shared upload-widget button + status text - extracted from two
 * near-identical copies previously in the product create/edit forms
 * (components/features/AdminOrdersClient.tsx), now also used by the
 * banner create form. The upload goes browser -> Cloudinary directly via
 * an unsigned preset (NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET, see the CSP
 * in next.config.mjs) - onChange only ever receives the resulting
 * secure_url, nothing is uploaded through this app's server.
 */
export default function CloudinaryImageField({
  value,
  onChange,
  buttonLabel,
  selectedLabel = "Image selected",
  emptyLabel = "No image uploaded",
  onDimensions,
}: CloudinaryImageFieldProps) {
  return (
    <div className="flex items-center gap-3">
      <CldUploadWidget
        uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
        options={{
          maxFiles: 1,
          resourceType: "image",
          clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
          maxFileSize: 10_000_000,
        }}
        onSuccess={(result) => {
          // result.info is typed string | CloudinaryUploadWidgetInfo by
          // Cloudinary's own SDK (@cloudinary-util/types) - it is NOT
          // always the full metadata object, so this has to check before
          // reading properties off it rather than casting straight to an
          // object shape (that cast previously let width/height silently
          // come back undefined while secure_url still happened to work).
          const info = result?.info;
          if (typeof info !== "object" || !info) {
            return;
          }
          if (info.secure_url) {
            onChange(info.secure_url);
          }
          if (onDimensions && info.width && info.height) {
            onDimensions(Number(info.width), Number(info.height));
          }
        }}
      >
        {({ open }) => (
          <button
            type="button"
            onClick={() => open()}
            className="tap-target rounded-md border-2 border-cookie-brown px-3 text-sm font-semibold text-cookie-brown-dark"
          >
            {buttonLabel}
          </button>
        )}
      </CldUploadWidget>
      <span className="text-sm text-cookie-brown-dark">{value ? selectedLabel : emptyLabel}</span>
    </div>
  );
}
