// Public, isomorphic configuration - safe to import from both Server and
// Client Components. Every env-backed value below is read as a full
// literal `process.env.NEXT_PUBLIC_*` expression (never
// `process.env[key]`), because Next.js only inlines env vars into the
// client bundle when it can statically see the complete property access.
//
// Secrets and server-only values (API keys, the PayNow number, the
// owner's inbox) belong in `config/server.ts` instead - never add one
// here, since anything exported from this module can end up in the
// browser bundle.

/** Brand name shown in the UI, page titles, email copy, and the PayNow
 * merchant-name field (EMVCo tag 59, truncated to 25 chars there). */
export const brandName = "One Crunch Lady";

// Used for the admin dashboard link in owner emails and for
// robots.ts/sitemap.ts; falls back to localhost when unset.
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// "" (not undefined) so every `whatsappNumber ? ... : fallback` call site
// keeps working with a plain truthiness check.
export const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

// Footer icons always render; an unconfigured deploy falls back to the
// platform homepage rather than hiding the icon outright.
export const instagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com";
export const tiktokUrl = process.env.NEXT_PUBLIC_TIKTOK_URL || "https://www.tiktok.com";

export const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
export const cloudinaryUploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// Absolute Cloudinary URL for the logo shown in every outgoing email
// (emails/BaseLayout.tsx). Deliberately NOT derived from siteUrl above -
// email is opened through Gmail/Outlook's own image proxies, which can't
// resolve http://localhost:3000, so every locally-sent test email showed
// alt text instead of the logo; even in production it was needlessly
// coupled to an env var that has nothing to do with images. f_png (not
// f_auto) because Outlook's desktop renderer doesn't support WebP -
// f_auto could serve WebP to Gmail while breaking Outlook, so PNG is the
// one safe universal choice for this transparent logo on a solid header.
export const emailLogoUrl = `https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/f_png,w_240,q_auto/ocl_logo-nobg_x2il4w.png`;

export const pickupHours = "Mon-Sat, 10:00 AM - 7:00 PM";

// PDPA requires a designated Data Protection Officer with a published
// business contact - WhatsApp alone does not satisfy that requirement.
// A role label, not a real person's name: the PDPC only requires the
// contact to be reachable, not the individual named (see the DPO_EMAIL
// comment in config/server.ts, which is what actually varies by deploy
// and needs to be an env var - this label doesn't).
export const dpoName = "One Crunch Lady (Data Protection Officer)";
