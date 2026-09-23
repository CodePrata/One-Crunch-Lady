import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export const BANNERS_CACHE_TAG = "promotion-banners";

export interface PromotionBanner {
  id: string;
  imageUrl: string;
  altText: string;
  /**
   * Real pixel dimensions captured at upload (see AdminBannersPanel /
   * CloudinaryImageField's onDimensions). Null for banners uploaded
   * before 014_add_banner_dimensions.sql - the promotion page falls back
   * to a safe, non-cropping treatment for those.
   */
  imageWidth: number | null;
  imageHeight: number | null;
}

interface BannerRow {
  id: string;
  image_url: string;
  alt_text: string;
  sort_order: number;
  is_active: boolean;
  image_width: number | null;
  image_height: number | null;
}

async function fetchActiveBanners(): Promise<PromotionBanner[]> {
  // Same service-role client used elsewhere on public pages (see
  // lib/supabase/server.ts's layering notes) - it bypasses RLS, so
  // is_active filtering happens here, not in a policy.
  const supabase = createClient();
  const { data, error } = await supabase
    .from("promotion_banners")
    .select("id,image_url,alt_text,sort_order,is_active,image_width,image_height")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to load promotion banners", error);
    throw new Error("Failed to load promotion banners.");
  }

  const banners = (data ?? []) as BannerRow[];

  return banners.map((banner) => ({
    id: banner.id,
    imageUrl: banner.image_url,
    altText: banner.alt_text,
    imageWidth: banner.image_width,
    imageHeight: banner.image_height,
  }));
}

/**
 * Mirrors lib/products.ts's getCatalogProducts() pattern: revalidates
 * every 60s, or immediately via revalidateTag(BANNERS_CACHE_TAG) from the
 * admin banner actions (app/actions/admin.ts).
 */
export const getActiveBanners = unstable_cache(fetchActiveBanners, ["active-promotion-banners"], {
  revalidate: 60,
  tags: [BANNERS_CACHE_TAG],
});
