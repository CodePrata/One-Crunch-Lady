import { createHash } from "node:crypto";

/** Never part of the string Cloudinary signs. */
const EXCLUDED_KEYS = new Set(["file", "cloud_name", "resource_type", "api_key"]);

/**
 * Cloudinary's upload signature: every parameter except the excluded
 * ones, sorted by key, joined as key=value with "&", the API secret
 * appended, SHA-1 hex. See "Generating authentication signatures" in
 * Cloudinary's docs; lib/cloudinary-signature.test.ts checks the worked
 * example from that page.
 */
export function signCloudinaryParams(
  params: Record<string, string | number | undefined>,
  apiSecret: string
): string {
  const toSign = Object.keys(params)
    .filter((key) => !EXCLUDED_KEYS.has(key))
    .filter((key) => params[key] !== undefined && params[key] !== "")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");
}

/** The only parameters the admin upload widget is allowed to get signed. */
export const ALLOWED_UPLOAD_PARAMS = new Set(["timestamp", "source", "upload_preset"]);
