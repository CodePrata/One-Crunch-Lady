-- Fix for 017_create_site_branding.sql's per-slot check constraints.
--
-- 017 wrote the "image set" branch as
--   url is not null and width > 0 and height > 0
-- but with width/height NULL, `null > 0` is NULL (unknown), and a CHECK
-- constraint only rejects FALSE - so a URL with no dimensions slipped
-- through. The app never writes that (setHeaderImage's zod schema
-- requires both), but the constraint is meant to guarantee it. Explicit
-- `is not null` makes the branch FALSE instead of unknown.
--
-- Idempotent: drop + re-add, same names as 017.

alter table public.site_branding
  drop constraint if exists site_branding_mascot_check;

alter table public.site_branding
  add constraint site_branding_mascot_check
  check (
    (header_mascot_url is null and header_mascot_width is null and header_mascot_height is null)
    or (
      header_mascot_url is not null
      and header_mascot_width is not null
      and header_mascot_height is not null
      and header_mascot_width > 0
      and header_mascot_height > 0
    )
  );

alter table public.site_branding
  drop constraint if exists site_branding_wordmark_check;

alter table public.site_branding
  add constraint site_branding_wordmark_check
  check (
    (header_wordmark_url is null and header_wordmark_width is null and header_wordmark_height is null)
    or (
      header_wordmark_url is not null
      and header_wordmark_width is not null
      and header_wordmark_height is not null
      and header_wordmark_width > 0
      and header_wordmark_height > 0
    )
  );
