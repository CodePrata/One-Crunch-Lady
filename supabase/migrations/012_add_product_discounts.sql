-- Phase 3: product-level discounts. `price` stays the ORIGINAL price -
-- discount_type/discount_value describe an optional markdown applied on
-- top of it, computed at read time (see lib/pricing.ts), never stored as
-- a second "sale price" column. That means toggling a discount off can
-- never lose the original price, and there is exactly one place
-- (lib/pricing.ts) that computes an effective price - both the storefront
-- display and the server-side order re-pricing in app/actions/orders.ts
-- call it, so they cannot diverge.

alter table public.products
  add column if not exists discount_type text;

alter table public.products
  add column if not exists discount_value numeric(10, 2);

alter table public.products
  drop constraint if exists products_discount_type_check;

alter table public.products
  add constraint products_discount_type_check
  check (discount_type is null or discount_type in ('PERCENT', 'FIXED'));

-- Airtight on all three axes: no discount at all, a valid percentage
-- (0-100], or a valid fixed-amount markdown that's strictly less than the
-- product's own price (a "discount" that meets or exceeds the price isn't
-- a discount). Any other combination - e.g. discount_type set with a null
-- value, or a FIXED discount >= price - fails every branch and is
-- rejected at the database layer, not just in application validation.
alter table public.products
  drop constraint if exists products_discount_value_check;

alter table public.products
  add constraint products_discount_value_check
  check (
    (discount_type is null and discount_value is null)
    or (
      discount_type = 'PERCENT'
      and discount_value is not null
      and discount_value > 0
      and discount_value <= 100
    )
    or (
      discount_type = 'FIXED'
      and discount_value is not null
      and discount_value > 0
      and discount_value < price
    )
  );
