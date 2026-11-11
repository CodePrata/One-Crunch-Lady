"use server";

import { cloudinaryApiSecret } from "@/config/server";
import { cloudinaryUploadPreset } from "@/config/site";
import { assertAdminAccess } from "@/lib/admin-auth";
import { ALLOWED_UPLOAD_PARAMS, signCloudinaryParams } from "@/lib/cloudinary-signature";

export type SignUploadResult = { ok: true; signature: string } | { ok: false; error: string };

/** Cloudinary rejects signatures older than an hour anyway; this refuses obviously stale or future timestamps up front. */
const MAX_TIMESTAMP_SKEW_SECONDS = 60 * 60;

/**
 * Signs an admin image upload (audit 2026-11 S-2). With the upload
 * preset set to "Signed" in Cloudinary, an upload only works with a
 * signature made from CLOUDINARY_API_SECRET, and only logged-in admins
 * can get one from here. Before this, the unsigned preset name in the
 * public JS bundle let anyone upload to the bakery's account.
 *
 * Only the parameters the widget normally sends are signed (timestamp,
 * source, upload_preset). Anything else, like a public_id that would
 * overwrite an existing image, is refused.
 */
export async function signCloudinaryUpload(
  paramsToSign: Record<string, string | number>
): Promise<SignUploadResult> {
  try {
    await assertAdminAccess();
  } catch {
    return { ok: false, error: "Your session has expired. Please log in again." };
  }

  const keys = Object.keys(paramsToSign ?? {});
  const unexpected = keys.filter((key) => !ALLOWED_UPLOAD_PARAMS.has(key));
  if (unexpected.length > 0) {
    console.error("[cloudinary] refused to sign unexpected params", unexpected);
    return { ok: false, error: "This upload can't be signed." };
  }

  if (cloudinaryUploadPreset && paramsToSign.upload_preset !== cloudinaryUploadPreset) {
    console.error("[cloudinary] refused to sign a different upload preset");
    return { ok: false, error: "This upload can't be signed." };
  }

  const timestamp = Number(paramsToSign.timestamp);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (
    !Number.isFinite(timestamp) ||
    Math.abs(nowSeconds - timestamp) > MAX_TIMESTAMP_SKEW_SECONDS
  ) {
    return { ok: false, error: "Your device clock looks wrong. Please fix it and try again." };
  }

  return { ok: true, signature: signCloudinaryParams(paramsToSign, cloudinaryApiSecret) };
}
