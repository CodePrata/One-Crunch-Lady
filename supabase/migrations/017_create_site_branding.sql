-- Admin-editable header branding: the mascot image and an optional
-- wordmark image (which replaces the "ONE CRUNCH LADY" text when set).
-- A single-row settings table (id is pinned to 1). A slot whose columns
-- are all null means "use the built-in default" - /public/header-logo.png
-- for the mascot, the Bangers text for the wordmark.
--
-- Read on EVERY page (the header lives in the root layout) through the
-- service-role client in lib/branding.ts, which bypasses RLS - so the
-- policies below protect the browser anon client, not app code. Same
-- shape as 013_create_promotion_banners.sql.

create table if not exists public.site_branding (
  id smallint primary key default 1,
  header_mascot_url text,
  header_mascot_width integer,
  header_mascot_height integer,
  header_wordmark_url text,
  header_wordmark_width integer,
  header_wordmark_height integer,
  updated_at timestamptz not null default now()
);

alter table public.site_branding
  drop constraint if exists site_branding_single_row_check;

alter table public.site_branding
  add constraint site_branding_single_row_check
  check (id = 1);

-- Dimensions are required with a URL (unlike promotion_banners): the
-- header renders each image at a fixed height and needs the real aspect
-- ratio to size its width.
alter table public.site_branding
  drop constraint if exists site_branding_mascot_check;

alter table public.site_branding
  add constraint site_branding_mascot_check
  check (
    (header_mascot_url is null and header_mascot_width is null and header_mascot_height is null)
    or (header_mascot_url is not null and header_mascot_width > 0 and header_mascot_height > 0)
  );

alter table public.site_branding
  drop constraint if exists site_branding_wordmark_check;

alter table public.site_branding
  add constraint site_branding_wordmark_check
  check (
    (header_wordmark_url is null and header_wordmark_width is null and header_wordmark_height is null)
    or (header_wordmark_url is not null and header_wordmark_width > 0 and header_wordmark_height > 0)
  );

alter table public.site_branding enable row level security;

-- The logo is shown publicly anyway - nothing here is secret.
drop policy if exists "site_branding_public_select" on public.site_branding;
create policy "site_branding_public_select"
on public.site_branding
for select
to public
using (true);

drop policy if exists "site_branding_auth_insert" on public.site_branding;
create policy "site_branding_auth_insert"
on public.site_branding
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "site_branding_auth_update" on public.site_branding;
create policy "site_branding_auth_update"
on public.site_branding
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "site_branding_auth_delete" on public.site_branding;
create policy "site_branding_auth_delete"
on public.site_branding
for delete
to authenticated
using (public.is_admin());

-- The one row, all defaults. Re-running this file never resets it.
insert into public.site_branding (id) values (1) on conflict (id) do nothing;
