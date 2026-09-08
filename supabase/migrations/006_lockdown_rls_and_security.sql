-- Lock down orders RLS: inserts go through the service-role client only,
-- and authenticated reads/writes are restricted to the admin account.
-- Also pins generate_order_ref's search_path to resolve the security advisor warning.

-- Drop all public/anon INSERT policies on orders — order creation happens
-- exclusively via the service-role client in app/actions/orders.ts, which
-- bypasses RLS entirely, so no insert policy is needed here.
drop policy if exists "orders_public_insert" on public.orders;
drop policy if exists "Allow public to insert orders" on public.orders;

-- Drop the anon "view their own orders" policy outright — its USING clause
-- evaluated unconditionally true, so it exposed every customer's PII
-- (name, email, phone, order contents) to any unauthenticated request.
drop policy if exists "Allow public to view their own orders" on public.orders;

-- Recreate authenticated SELECT/UPDATE scoped to the admin account only.
-- TODO: replace 'YOUR_ACTUAL_ADMIN_EMAIL' with the real admin email
-- (must match ADMIN_EMAIL in app/actions/admin.ts) before running this migration.
drop policy if exists "orders_auth_select" on public.orders;
create policy "orders_auth_select"
on public.orders
for select
to authenticated
using (auth.jwt() ->> 'email' = 'YOUR_ACTUAL_ADMIN_EMAIL');

drop policy if exists "orders_auth_update" on public.orders;
create policy "orders_auth_update"
on public.orders
for update
to authenticated
using (auth.jwt() ->> 'email' = 'YOUR_ACTUAL_ADMIN_EMAIL')
with check (auth.jwt() ->> 'email' = 'YOUR_ACTUAL_ADMIN_EMAIL');

-- Pin search_path to resolve the "Function Search Path Mutable" advisor warning.
create or replace function public.generate_order_ref()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id is null then
    new.id := nextval(pg_get_serial_sequence('public.orders', 'id'));
  end if;

  if new.order_ref is null or new.order_ref = '' then
    new.order_ref := format(
      'OCL-%s-%s',
      to_char(coalesce(new.created_at, now()), 'YYMM'),
      lpad(new.id::text, 4, '0')
    );
  end if;

  return new;
end;
$$;
