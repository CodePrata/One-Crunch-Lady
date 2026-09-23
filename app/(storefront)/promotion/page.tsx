import type { Metadata } from "next";
import Image from "next/image";
import { getActiveBanners } from "@/lib/banners";

export const metadata: Metadata = {
  title: "Promotion",
  description: "Current promotions and offers from One Crunch Lady.",
};

// Matches app/(storefront)/page.tsx's convention - see lib/banners.ts's
// doc comment for why this and the underlying unstable_cache revalidate
// window are kept in sync.
export const revalidate = 60;

export default async function PromotionPage() {
  const banners = await getActiveBanners();

  return (
    <main className="responsive-shell px-4 py-10 tablet:px-6 desktop:px-8">
      <h1 className="font-display text-5xl uppercase leading-none text-cookie-brown-dark tablet:text-6xl">
        Promotion
      </h1>

      <div className="mx-auto mt-8 max-w-3xl">
        {banners.length === 0 ? (
          <div className="impact-border rounded-2xl bg-hero-yellow/30 p-10 text-center">
            <p className="font-display text-3xl uppercase text-cookie-brown-dark">
              No promotions available now!
            </p>
            <p className="mt-2 text-base text-cookie-brown-dark">
              Check back soon - new deals get posted here first.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {banners.map((banner) =>
              banner.imageWidth && banner.imageHeight ? (
                // Rendered at its own real aspect ratio - the frame fits
                // the image, never the other way around, so nothing is
                // ever cropped regardless of what shape an admin uploads.
                <div
                  key={banner.id}
                  className="impact-border overflow-hidden rounded-2xl bg-flour-white"
                >
                  <Image
                    src={banner.imageUrl}
                    alt={banner.altText}
                    width={banner.imageWidth}
                    height={banner.imageHeight}
                    className="h-auto w-full"
                    sizes="(max-width: 767px) 100vw, 768px"
                  />
                </div>
              ) : (
                // Legacy banner uploaded before dimensions were captured
                // (014_add_banner_dimensions.sql) - object-contain never
                // crops or distorts, it just may letterbox if the image
                // isn't 16:9. Re-uploading it restores a perfect fit.
                <div
                  key={banner.id}
                  className="impact-border relative aspect-[16/9] overflow-hidden rounded-2xl bg-flour-white"
                >
                  <Image
                    src={banner.imageUrl}
                    alt={banner.altText}
                    fill
                    className="object-contain"
                    sizes="(max-width: 767px) 100vw, 768px"
                  />
                </div>
              )
            )}
          </div>
        )}
      </div>
    </main>
  );
}
