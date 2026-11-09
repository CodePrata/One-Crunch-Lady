import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export const FAQ_CACHE_TAG = "faq-items";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface FaqItemRow {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
}

async function fetchPublishedFaqItems(): Promise<FaqItem[]> {
  // Same service-role client used elsewhere on public pages (see
  // lib/supabase/server.ts's layering notes) - it bypasses RLS, so
  // is_published filtering happens here, not in a policy.
  const supabase = createClient();
  const { data, error } = await supabase
    .from("faq_items")
    .select("id,question,answer,sort_order")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load FAQ items", error);
    throw new Error("Failed to load FAQ items.");
  }

  const rows = (data ?? []) as FaqItemRow[];

  return rows.map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
  }));
}

/**
 * Mirrors lib/banners.ts's getActiveBanners() pattern: revalidates every
 * 60s, or immediately via revalidateTag(FAQ_CACHE_TAG) from the admin FAQ
 * actions (app/actions/admin.ts).
 */
export const getPublishedFaqItems = unstable_cache(
  fetchPublishedFaqItems,
  ["published-faq-items"],
  {
    revalidate: 60,
    tags: [FAQ_CACHE_TAG],
  }
);
