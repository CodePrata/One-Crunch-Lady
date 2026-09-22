import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export const PRODUCTS_CACHE_TAG = "products";

export interface CatalogProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  category: string | null;
  ingredients: string[];
  isAvailable: boolean;
}

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  image_url: string | null;
  category: string | null;
  ingredients: string | null;
  is_available: boolean;
}

function parseIngredients(ingredients: string | null): string[] {
  if (!ingredients) {
    return [];
  }

  return ingredients
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function fetchCatalogProducts(): Promise<CatalogProduct[]> {
  // Same service-role client used elsewhere on public pages (see
  // lib/supabase/server.ts's layering notes) - it bypasses RLS, so
  // is_available filtering happens here, not in a policy.
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id,name,slug,description,price,image_url,category,ingredients,is_available,created_at")
    .eq("is_available", true)
    .order("created_at", { ascending: false });

  if (error) {
    // Full detail stays server-side; app/error.tsx only ever shows the
    // customer a generic message plus the digest, never this text.
    console.error("Failed to load products", error);
    throw new Error("Failed to load products.");
  }

  const products = (data ?? []) as ProductRow[];

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    imageUrl: product.image_url,
    category: product.category,
    ingredients: parseIngredients(product.ingredients),
    isAvailable: product.is_available,
  }));
}

/**
 * The one product read shared by the storefront layout (cart shell:
 * bubble/drawer/toast) and every page under app/(storefront) - a single
 * cached call serves all of them instead of each page re-querying
 * Supabase. Revalidates every 60s, matching the previous per-page
 * `export const revalidate = 60`, or immediately via
 * revalidateTag(PRODUCTS_CACHE_TAG) from admin product mutations
 * (see app/actions/admin.ts) - keep both in sync with any change here.
 */
export const getCatalogProducts = unstable_cache(fetchCatalogProducts, ["catalog-products"], {
  revalidate: 60,
  tags: [PRODUCTS_CACHE_TAG],
});
