/**
 * Custom `next/image` loader. Without this, every <Image> goes through
 * Next's default loader, which on Netlify rewrites to
 * `/.netlify/images?url=...` (see the adapter-generated netlify.toml) -
 * billing Netlify bandwidth + request credits to re-encode a Cloudinary
 * URL that `getOptimizedImage()` already optimized. This loader emits
 * the Cloudinary URL directly so the browser fetches from
 * res.cloudinary.com, bypassing Netlify's image pipeline entirely.
 *
 * Registered via `images.loader: "custom"` + `images.loaderFile` in
 * next.config.mjs. A custom loader applies to every <Image> in the app,
 * including local `/public` assets (the header logo, splash image) -
 * those are passed through untouched rather than sent to Cloudinary.
 */
import type { ImageLoaderProps } from "next/image";

function getCloudinaryCloudName(): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  if (!cloudName) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME");
  }

  return cloudName;
}

export default function cloudinaryLoader({ src, width, quality }: ImageLoaderProps): string {
  // Local /public assets (e.g. "/ocl_logo-nobg.png") - never route these
  // through Cloudinary, just serve them as-is from the Netlify CDN.
  if (src.startsWith("/")) {
    return src;
  }

  const q = quality ?? 75;
  const transformation = `f_auto,q_${q},w_${width}`;

  // CASE 1: src is already a full Cloudinary URL.
  if (src.includes("res.cloudinary.com")) {
    // Already has transformations applied (e.g. from a hand-authored
    // admin URL) - don't double up, return as-is.
    if (src.includes("/upload/c_") || src.includes("/upload/f_")) {
      return src;
    }
    return src.replace("/upload/", `/upload/${transformation}/`);
  }

  // CASE 2: src is a bare Cloudinary public ID.
  const cloudName = getCloudinaryCloudName();
  const encodedPublicId = encodeURIComponent(src);
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformation}/${encodedPublicId}`;
}
