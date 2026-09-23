"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createBanner, deleteBanner, toggleBannerActive } from "@/app/actions/admin";
import CloudinaryImageField from "@/components/features/admin/CloudinaryImageField";

interface AdminBanner {
  id: string;
  image_url: string;
  alt_text: string;
  sort_order: number;
  is_active: boolean;
  image_width: number | null;
  image_height: number | null;
}

interface BannerDraft {
  image_url: string;
  alt_text: string;
  sort_order: string;
  image_width: number | null;
  image_height: number | null;
}

const EMPTY_BANNER_DRAFT: BannerDraft = {
  image_url: "",
  alt_text: "",
  sort_order: "0",
  image_width: null,
  image_height: null,
};

/**
 * New in Phase 3 - manages the banners shown on /promotion
 * (promotion_banners table, 013_create_promotion_banners.sql). Mirrors
 * AdminProductsPanel's create-form + list shape for consistency.
 */
export default function AdminBannersPanel({
  initialBanners,
  onFeedback,
}: {
  initialBanners: AdminBanner[];
  onFeedback: (message: string) => void;
}) {
  const router = useRouter();
  const [banners, setBanners] = useState<AdminBanner[]>(initialBanners);
  const [isCreatingBanner, setIsCreatingBanner] = useState(false);
  const [newBanner, setNewBanner] = useState<BannerDraft>(EMPTY_BANNER_DRAFT);

  useEffect(() => {
    setBanners(initialBanners);
  }, [initialBanners]);

  async function handleCreateBanner(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await createBanner({
        image_url: newBanner.image_url,
        alt_text: newBanner.alt_text,
        sort_order: newBanner.sort_order ? Number(newBanner.sort_order) : undefined,
        // Optional - Cloudinary doesn't always hand back dimensions (see
        // CloudinaryImageField's onSuccess comment). When missing,
        // /promotion just falls back to a safe, non-cropping display
        // rather than blocking banner creation entirely over it.
        image_width: newBanner.image_width ?? undefined,
        image_height: newBanner.image_height ?? undefined,
      });
      onFeedback(
        newBanner.image_width && newBanner.image_height
          ? "Banner created."
          : "Banner created, but its dimensions weren't captured - it'll display letterboxed until you re-upload it."
      );
      setNewBanner(EMPTY_BANNER_DRAFT);
      setIsCreatingBanner(false);
      router.refresh();
    } catch (error) {
      onFeedback(error instanceof Error ? error.message : "Failed to create banner.");
    }
  }

  async function handleToggleBanner(bannerId: string, isActive: boolean) {
    try {
      await toggleBannerActive(bannerId, isActive);
      onFeedback("Banner updated.");
      setBanners((current) =>
        current.map((banner) => (banner.id === bannerId ? { ...banner, is_active: isActive } : banner))
      );
      router.refresh();
    } catch (error) {
      onFeedback(error instanceof Error ? error.message : "Failed to update banner.");
    }
  }

  async function handleDeleteBanner(bannerId: string) {
    const confirmed = window.confirm("Delete this banner? This cannot be undone.");
    if (!confirmed) {
      return;
    }

    try {
      await deleteBanner(bannerId);
      onFeedback("Banner deleted.");
      setBanners((current) => current.filter((banner) => banner.id !== bannerId));
      router.refresh();
    } catch (error) {
      onFeedback(error instanceof Error ? error.message : "Failed to delete banner.");
    }
  }

  return (
    <>
      <section className="mb-8 rounded-2xl border-[3px] border-cookie-brown bg-flour-white p-6">
        <button
          type="button"
          onClick={() => setIsCreatingBanner((current) => !current)}
          className="tap-target rounded-md border-[3px] border-cookie-brown bg-power-red px-5 font-bold text-flour-white"
        >
          Add New Banner
        </button>

        {isCreatingBanner ? (
          <form onSubmit={handleCreateBanner} className="mt-4 grid gap-3">
            <CloudinaryImageField
              value={newBanner.image_url}
              onChange={(url) => setNewBanner((current) => ({ ...current, image_url: url }))}
              onDimensions={(width, height) =>
                setNewBanner((current) => ({
                  ...current,
                  image_width: width,
                  image_height: height,
                }))
              }
              buttonLabel="Upload Banner Image"
            />
            <input
              required
              placeholder="Alt text (describes the banner for screen readers)"
              value={newBanner.alt_text}
              onChange={(event) =>
                setNewBanner((current) => ({ ...current, alt_text: event.target.value }))
              }
              className="tap-target rounded-md border-2 border-cookie-brown px-3"
            />
            <input
              type="number"
              placeholder="Sort order (lower shows first, default 0)"
              value={newBanner.sort_order}
              onChange={(event) =>
                setNewBanner((current) => ({ ...current, sort_order: event.target.value }))
              }
              className="tap-target rounded-md border-2 border-cookie-brown px-3"
            />
            <button
              type="submit"
              disabled={!newBanner.image_url}
              className="tap-target rounded-md border-2 border-cookie-brown bg-hero-yellow px-4 font-semibold text-cookie-brown-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              Create Banner
            </button>
          </form>
        ) : null}
      </section>

      <section className="rounded-2xl border-[3px] border-cookie-brown bg-flour-white p-6">
        <h2 className="font-display text-4xl uppercase text-cookie-brown-dark">
          Promotion Banners
        </h2>
        {banners.length === 0 ? (
          <p className="mt-4 text-sm text-cookie-brown-dark">
            No banners yet - customers will see the &quot;No promotions available now!&quot;
            fallback on /promotion until one is added.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="flex flex-wrap items-center gap-4 rounded-xl border-2 border-cookie-brown p-3"
              >
                <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-md border-2 border-cookie-brown bg-flour-white">
                  <Image
                    src={banner.image_url}
                    alt={banner.alt_text}
                    fill
                    className="object-cover"
                    sizes="112px"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-cookie-brown-dark">{banner.alt_text}</p>
                  <p className="text-xs text-cookie-brown-dark">
                    Sort order: {banner.sort_order}
                    {banner.image_width && banner.image_height
                      ? ` (${banner.image_width}x${banner.image_height})`
                      : " - legacy upload, no stored dimensions"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleBanner(banner.id, !banner.is_active)}
                    className={`tap-target rounded-md border-2 border-cookie-brown px-4 text-sm font-semibold ${
                      banner.is_active
                        ? "bg-hero-yellow text-cookie-brown-dark"
                        : "bg-cookie-brown text-flour-white"
                    }`}
                  >
                    {banner.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBanner(banner.id)}
                    className="tap-target rounded-md border-2 border-cookie-brown px-4 text-sm font-semibold text-cookie-brown-dark transition hover:text-power-red"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
