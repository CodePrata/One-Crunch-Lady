import { unstable_cache } from "next/cache";
import { defaultHeaderMascot } from "@/config/site";
import { createClient } from "@/lib/supabase/server";
import type { BrandImage, HeaderBranding } from "@/types/models";

export const BRANDING_CACHE_TAG = "site-branding";

const DEFAULT_HEADER_BRANDING: HeaderBranding = {
  mascot: defaultHeaderMascot,
  wordmark: null,
};

interface BrandingRow {
  header_mascot_url: string | null;
  header_mascot_width: number | null;
  header_mascot_height: number | null;
  header_wordmark_url: string | null;
  header_wordmark_width: number | null;
  header_wordmark_height: number | null;
}

function toBrandImage(
  url: string | null,
  width: number | null,
  height: number | null
): BrandImage | null {
  // The table's check constraints already guarantee all-or-nothing per
  // slot; this just narrows the types.
  if (!url || !width || !height) {
    return null;
  }
  return { url, width, height };
}

async function fetchHeaderBranding(): Promise<HeaderBranding> {
  // Service-role client (bypasses RLS) - fine here, the row is public.
  const supabase = createClient();
  const { data, error } = await supabase
    .from("site_branding")
    .select(
      "header_mascot_url,header_mascot_width,header_mascot_height,header_wordmark_url,header_wordmark_width,header_wordmark_height"
    )
    .eq("id", 1)
    .maybeSingle();

  // Throw (rather than return defaults) so unstable_cache doesn't store
  // the failure - getHeaderBranding() below catches it and falls back.
  if (error) {
    throw new Error(`Failed to load header branding: ${error.message}`);
  }

  if (!data) {
    return DEFAULT_HEADER_BRANDING;
  }

  const row = data as BrandingRow;

  return {
    mascot:
      toBrandImage(row.header_mascot_url, row.header_mascot_width, row.header_mascot_height) ??
      defaultHeaderMascot,
    wordmark: toBrandImage(
      row.header_wordmark_url,
      row.header_wordmark_width,
      row.header_wordmark_height
    ),
  };
}

/**
 * Read by the ROOT layout, so every page depends on it. Deliberately
 * `revalidate: false` rather than the 60s the other readers use: in
 * Next 14 a timed unstable_cache revalidate propagates to every page that
 * reads it, which would turn fully static pages (/story, /privacy, ...)
 * into 60s ISR and draw Netlify function invocations. Freshness comes
 * from on-demand revalidation instead - the admin branding actions call
 * revalidateTag(BRANDING_CACHE_TAG) + revalidatePath("/", "layout")
 * (app/actions/admin.ts).
 */
const getCachedHeaderBranding = unstable_cache(fetchHeaderBranding, ["header-branding"], {
  revalidate: false,
  tags: [BRANDING_CACHE_TAG],
});

/**
 * Fails soft, unlike lib/banners.ts: the header renders on every page
 * (404/error pages and build-time prerender included), so a failed
 * branding read - or migration 017 not applied yet - falls back to the
 * built-in logo rather than taking the whole site down. The fallback
 * happens outside the cache on purpose: with no time-based expiry, a
 * cached transient error would otherwise pin the defaults until the next
 * admin save.
 */
export async function getHeaderBranding(): Promise<HeaderBranding> {
  try {
    return await getCachedHeaderBranding();
  } catch (error) {
    console.error("Using default header branding:", error);
    return DEFAULT_HEADER_BRANDING;
  }
}
