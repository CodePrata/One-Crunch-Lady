"use client";

import { CldUploadWidget } from "next-cloudinary";
import { signCloudinaryUpload } from "@/app/actions/cloudinary";

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
 * banner create form. The upload goes browser -> Cloudinary directly (see
 * the CSP in next.config.mjs), signed per upload by the admin-only
 * signCloudinaryUpload action - onChange only ever receives the resulting
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
          // Matches the 5 MB limit set on the preset itself in the
          // Cloudinary console, which is the limit that's enforced.
          maxFileSize: 5_000_000,
          // Signed upload (audit 2026-11 S-2): the widget asks our
          // admin-only server action to sign each upload. Passed here
          // rather than via signatureEndpoint because this app has no API
          // routes - next-cloudinary uses a function given in options as
          // is. The API key comes from NEXT_PUBLIC_CLOUDINARY_API_KEY.
          uploadSignature: (
            callback: (signature: string | null) => void,
            paramsToSign: Record<string, string | number>
          ) => {
            signCloudinaryUpload(paramsToSign)
              .then((result) => {
                if (!result.ok) {
                  console.error("[cloudinary] upload signing refused:", result.error);
                  callback(null);
                  return;
                }
                callback(result.signature);
              })
              .catch((error: unknown) => {
                console.error("[cloudinary] upload signing failed", error);
                callback(null);
              });
          },
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
