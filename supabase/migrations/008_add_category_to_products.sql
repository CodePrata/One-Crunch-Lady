-- Phase 3: add a bake-type category to products, for the catalog filters
-- (All / Cookies / Muffins / Cakes / ...).
--
-- Nullable, not an enum: app/actions/admin.ts already has a free-text
-- <input> for category (components/features/AdminOrdersClient.tsx), and
-- new categories should not require a migration to add. The check
-- constraint below only guards against empty-string/whitespace values and
-- unreasonable length, it does not restrict to a fixed vocabulary.

alter table public.products
  add column if not exists category text;

alter table public.products
  drop constraint if exists products_category_check;

alter table public.products
  add constraint products_category_check
  check (
    category is null
    or (length(btrim(category)) > 0 and length(category) <= 40)
  );

-- Backfill the seeded catalog (004_seed_products.sql). All four rows are
-- cookies; guarded by "category is null" so this is a no-op against any
-- category an admin has already set through the dashboard.
update public.products
set category = 'Cookies'
where slug in (
  'serious-choc-chip',
  'the-cyborg',
  'the-dark-matter',
  'the-sidekick'
)
and category is null;
