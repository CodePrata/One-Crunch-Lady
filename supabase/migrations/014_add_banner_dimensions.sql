-- Phase 3 follow-up: store each banner's real pixel dimensions so
-- /promotion can render it at its own aspect ratio instead of forcing
-- every banner into a fixed box. The original rendering used a fixed
-- 16:9 crop (object-cover), which cut off any banner that wasn't
-- actually 16:9 - the "outline" needs to fit the image, not the other
-- way around. Nullable: existing banners uploaded before this migration
-- won't have these set (app/(storefront)/promotion/page.tsx falls back
-- to a safe, non-cropping letterboxed treatment for those).

alter table public.promotion_banners
  add column if not exists image_width integer;

alter table public.promotion_banners
  add column if not exists image_height integer;

alter table public.promotion_banners
  drop constraint if exists promotion_banners_dimensions_check;

alter table public.promotion_banners
  add constraint promotion_banners_dimensions_check
  check (
    (image_width is null and image_height is null)
    or (image_width > 0 and image_height > 0)
  );
