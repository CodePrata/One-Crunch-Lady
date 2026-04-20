create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_created_at on public.orders (created_at desc);

alter table public.products enable row level security;
alter table public.orders enable row level security;

drop policy if exists "products_public_select" on public.products;
create policy "products_public_select"
on public.products
for select
to public
using (true);

drop policy if exists "products_auth_insert" on public.products;
create policy "products_auth_insert"
on public.products
for insert
to authenticated
with check (true);

drop policy if exists "products_auth_update" on public.products;
create policy "products_auth_update"
on public.products
for update
to authenticated
using (true)
with check (true);

drop policy if exists "products_auth_delete" on public.products;
create policy "products_auth_delete"
on public.products
for delete
to authenticated
using (true);

drop policy if exists "orders_public_insert" on public.orders;
create policy "orders_public_insert"
on public.orders
for insert
to public
with check (true);

drop policy if exists "orders_auth_select" on public.orders;
create policy "orders_auth_select"
on public.orders
for select
to authenticated
using (true);

drop policy if exists "orders_auth_update" on public.orders;
create policy "orders_auth_update"
on public.orders
for update
to authenticated
using (true)
with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end
$$;
