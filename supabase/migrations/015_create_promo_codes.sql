-- Phase 4: promo codes.
--
-- No free_delivery column, deliberately - this system is pickup-only
-- (no address field, no delivery fee, "Ready for Pickup" emails), so a
-- dormant delivery-related column would ship unused from day one. Add it
-- in a future migration if/when delivery becomes a real feature.

create extension if not exists citext;

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code citext not null unique,
  discount_type text not null check (discount_type in ('PERCENT', 'FIXED')),
  discount_value numeric(10, 2) not null check (discount_value > 0),
  min_subtotal numeric(10, 2) not null default 0 check (min_subtotal >= 0),
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- A PERCENT discount over 100% makes no sense - mirrors the same
-- PERCENT <= 100 rule as products_discount_value_check
-- (012_add_product_discounts.sql).
alter table public.promo_codes
  drop constraint if exists promo_codes_percent_bounds_check;

alter table public.promo_codes
  add constraint promo_codes_percent_bounds_check
  check (discount_type <> 'PERCENT' or discount_value <= 100);

alter table public.promo_codes enable row level security;
-- No policies at all, on purpose - mirrors admin_users
-- (007_admin_users_and_rls.sql): codes must not be enumerable by the
-- anon client, so there is deliberately no public select policy. Every
-- read/write goes through the service-role client inside server actions
-- (app/actions/promo.ts, app/actions/admin.ts), which bypasses RLS
-- regardless of policies - a policy here would either publish the code
-- list or, if scoped to admins, create exactly the enumeration surface
-- this table must not have for anyone else.

-- orders: the promo code applied to this order, if any, and the
-- resulting discount. total_price remains the final payable amount -
-- what the PayNow QR encodes (EMVCo tag 54) and what every email prints
-- - never repurposed. subtotal is the pre-discount total, kept for the
-- record; discount_amount is subtotal minus total_price.
alter table public.orders
  add column if not exists promo_code text;

alter table public.orders
  add column if not exists discount_amount numeric(10, 2) not null default 0;

alter table public.orders
  drop constraint if exists orders_discount_amount_check;

alter table public.orders
  add constraint orders_discount_amount_check
  check (discount_amount >= 0);

alter table public.orders
  add column if not exists subtotal numeric(10, 2);

alter table public.orders
  drop constraint if exists orders_subtotal_check;

alter table public.orders
  add constraint orders_subtotal_check
  check (subtotal is null or subtotal >= 0);

-- Atomic redemption claim. The Supabase JS client's .update() can only
-- set literal values, not an expression referencing the current row
-- (`redemption_count = redemption_count + 1`), so a true atomic
-- increment - one that can't let two concurrent orders both squeeze past
-- max_redemptions - has to happen in SQL, not as a JS read-then-write.
-- security definer because promo_codes has no RLS policies at all
-- (intentional, see above) - this function needs to bypass that the same
-- way public.is_admin() bypasses RLS on admin_users (007_admin_users_and_rls.sql).
create or replace function public.claim_promo_redemption(promo_id uuid)
returns public.promo_codes
language sql
security definer
set search_path = public
as $$
  update public.promo_codes
  set redemption_count = redemption_count + 1
  where id = promo_id
    and is_active = true
    and (max_redemptions is null or redemption_count < max_redemptions)
  returning *;
$$;

revoke all on function public.claim_promo_redemption(uuid) from public;
-- Only the service-role client calls this (app/actions/orders.ts's
-- createOrder) - never from the browser/anon/authenticated context.
grant execute on function public.claim_promo_redemption(uuid) to service_role;
