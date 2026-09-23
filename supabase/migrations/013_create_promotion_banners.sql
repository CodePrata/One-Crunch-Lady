-- Phase 3: promotion banners shown on /promotion. Mirrors the products
-- table's RLS shape (007_admin_users_and_rls.sql): public can read active
-- banners, only admins (public.is_admin()) can write. Server code reaches
-- this table through the service-role client either way (bypasses RLS -
-- see CLAUDE.md's "Supabase client layering" note), so these policies are
-- what actually protects the browser anon client, not app code.

create table if not exists public.promotion_banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  alt_text text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.promotion_banners enable row level security;

drop policy if exists "promotion_banners_public_select" on public.promotion_banners;
create policy "promotion_banners_public_select"
on public.promotion_banners
for select
to public
using (is_active = true or public.is_admin());

drop policy if exists "promotion_banners_auth_insert" on public.promotion_banners;
create policy "promotion_banners_auth_insert"
on public.promotion_banners
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "promotion_banners_auth_update" on public.promotion_banners;
create policy "promotion_banners_auth_update"
on public.promotion_banners
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "promotion_banners_auth_delete" on public.promotion_banners;
create policy "promotion_banners_auth_delete"
on public.promotion_banners
for delete
to authenticated
using (public.is_admin());

-- Serves both the public /promotion read (active banners, sorted) and the
-- admin panel's full list (all banners, sorted).
create index if not exists idx_promotion_banners_active_sort
on public.promotion_banners (is_active, sort_order);
