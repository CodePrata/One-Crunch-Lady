-- Phase 2: admin_users table + is_admin() replace hardcoded ADMIN_EMAIL checks.

   create extension if not exists citext;

   create table if not exists public.admin_users (
     user_id uuid primary key references auth.users(id) on delete cascade,
     email citext not null,
     created_at timestamptz not null default now()
   );

   alter table public.admin_users enable row level security;
   -- No anon/authenticated policies on purpose: only service-role and the
   -- security-definer is_admin() function below may read this table. A
   -- SELECT policy here would either publish the admin roster or, if an
   -- EXISTS(...) queried admin_users directly from another table's policy,
   -- silently deny everyone (the subquery runs as the calling role).

   create or replace function public.is_admin()
   returns boolean
   language sql
   stable
   security definer
   set search_path = public
   as $$
     select exists (
       select 1 from public.admin_users where user_id = auth.uid()
     );
   $$;

   revoke all on function public.is_admin() from public;
   grant execute on function public.is_admin() to authenticated;

   -- Seed the existing owner (idempotent: resolves against auth.users by
   -- email since admin_users has no prior rows).
   insert into public.admin_users (user_id, email)
   select id, email
   from auth.users
   where email = 'amadeus12321@gmail.com'
   on conflict (user_id) do nothing;

   -- Guard against removing the last admin.
   create or replace function public.prevent_last_admin_delete()
   returns trigger
   language plpgsql
   security definer
   set search_path = public
   as $$
   begin
     if (select count(*) from public.admin_users) <= 1 then
       raise exception 'Cannot delete the last remaining admin_users row.';
     end if;
     return old;
   end;
   $$;

   drop trigger if exists trg_prevent_last_admin_delete on public.admin_users;
   create trigger trg_prevent_last_admin_delete
   before delete on public.admin_users
   for each row
   execute function public.prevent_last_admin_delete();

   -- orders: replace the literal-email checks from migration 006.
   drop policy if exists "orders_auth_select" on public.orders;
   create policy "orders_auth_select"
   on public.orders
   for select
   to authenticated
   using (public.is_admin());

   drop policy if exists "orders_auth_update" on public.orders;
   create policy "orders_auth_update"
   on public.orders
   for update
   to authenticated
   using (public.is_admin())
   with check (public.is_admin());

   -- products: lock down all writes to admins only.
   drop policy if exists "products_auth_insert" on public.products;
   create policy "products_auth_insert"
   on public.products
   for insert
   to authenticated
   with check (public.is_admin());

   drop policy if exists "products_auth_update" on public.products;
   create policy "products_auth_update"
   on public.products
   for update
   to authenticated
   using (public.is_admin())
   with check (public.is_admin());

   drop policy if exists "products_auth_delete" on public.products;
   create policy "products_auth_delete"
   on public.products
   for delete
   to authenticated
   using (public.is_admin());

   -- products: public read stays open, but only for available items or admins
   -- (closes at the DB layer what app/page.tsx already filters server-side).
   -- Drop both known live/migration names for this policy since they've diverged.
   drop policy if exists "Enable read access for all users" on public.products;
   drop policy if exists "products_public_select" on public.products;
   create policy "products_public_select"
   on public.products
   for select
   to public
   using (is_available = true or public.is_admin());