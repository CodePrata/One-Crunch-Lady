# Admin Users Table Migration (Phase 2)

## Context

- Admin authorization is currently a single hardcoded constant, `ADMIN_EMAIL = "amadeus12321@gmail.com"`, duplicated in `app/actions/admin.ts:50` (server gate, checked in `assertAdminAccess()`) and `app/admin/login/page.tsx:8` (client login form, rendered as a read-only prefilled field). This does not scale past one owner and blocks client handoff.
- `orders` RLS (`supabase/migrations/006_lockdown_rls_and_security.sql`, already applied live) currently gates `orders_auth_select` / `orders_auth_update` on a literal-email check: `auth.jwt() ->> 'email' = 'amadeus12321@gmail.com'`. This has the same one-admin ceiling and must move to a table-backed check.
- `products` RLS was **not** touched by migration 006. Live policies `products_auth_insert`, `products_auth_update`, `products_auth_delete` all have `qual`/`with_check` of literal `true` for the `authenticated` role — any signed-up user (not just the admin) can currently insert, edit, or delete any product row via the browser anon client. The public SELECT policy (`"Enable read access for all users"`, `qual: true`) also exposes unavailable (`is_available = false`) products at the RLS layer, though `app/page.tsx` filters this server-side already.
- Affected files:
  - `supabase/migrations/007_admin_users_and_rls.sql` (new)
  - `app/actions/admin.ts` (modify `assertAdminAccess()`, remove `ADMIN_EMAIL`)
  - `app/admin/login/page.tsx` (modify email field, remove `ADMIN_EMAIL`)

## Scope of Work

- `supabase/migrations/007_admin_users_and_rls.sql` (new) — create `admin_users` table keyed on `user_id`, create `public.is_admin()` security-definer function, seed the existing owner, add a last-admin-delete guard trigger, rewrite `orders` and `products` RLS policies to use `is_admin()`.
- `app/actions/admin.ts` (modify) — remove the `ADMIN_EMAIL` constant; `assertAdminAccess()` calls the `is_admin` RPC on the auth-scoped client instead of comparing `user.email`.
- `app/admin/login/page.tsx` (modify) — remove the `ADMIN_EMAIL` constant; the email field becomes a normal controlled input instead of a read-only prefilled one.
- Non-goals (explicitly out of scope for this spec):
  - No admin-management UI (inviting/removing admins is a manual `insert`/`delete` on `admin_users` via the Supabase SQL editor for now).
  - No Vercel function region pinning. Note only: the project database is `ap-northeast-1`; `assertAdminAccess()` already pays one cross-Pacific round trip for `auth.getUser()`, and the new `is_admin` RPC adds a second. If admin-action latency becomes noticeable, pin the relevant Vercel functions to `hnd1`/`sin1` — separate follow-up, not part of this migration.
  - No code change for Supabase Auth signup settings — see prerequisite below, it's a dashboard toggle, not a file in this repo.
  - No change to `middleware.ts` — it already only checks "some user is logged in" and defers the real check to `assertAdminAccess()`; that division of responsibility is unchanged.

**Prerequisite (manual, must be confirmed before this ships, not enforced by this spec):** In the Supabase Dashboard, under Authentication → Providers → Email, either disable "Allow new users to sign up" or require email confirmation. Once `app/admin/login/page.tsx` accepts an arbitrary email, an open-signup project lets anyone create an `auth.users` row for any address — including one already seeded into `admin_users` — and log in as that admin. This migration does not and cannot enforce this from SQL or application code.

## Step-by-Step Implementation

1. **Create migration `supabase/migrations/007_admin_users_and_rls.sql`.** Follow this repo's idempotency convention (`create table if not exists`, `create or replace function`, `drop policy if exists` + `create policy`, `drop trigger if exists` + `create trigger`). Exact contents:

   ```sql
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
   ```

   **Do not execute this SQL against the database.** It is applied by hand through the Supabase SQL editor by the user, per this repo's convention — same as migration 006.

2. **Modify `app/actions/admin.ts`.** Remove the `ADMIN_EMAIL` constant (line 50). Rewrite `assertAdminAccess()` (lines 52-62): after `authClient.auth.getUser()` resolves a `user`, call `.rpc('is_admin')` on that same auth-scoped client (`supabaseServerAuth()`). Treat any of: RPC error, `user` missing, or the RPC result not being exactly `true` as unauthorized. Throw the exact same message as today, `"Unauthorized admin access."`, in every failure case — no behavior change to callers, no new error variants, fail closed on any ambiguity (including RPC network errors).

3. **Modify `app/admin/login/page.tsx`.** Remove the `ADMIN_EMAIL` constant (line 8). Add an `email` field to component state (`useState`, initial value `""`), following the existing `password` state pattern in the same file. Change the email `<input>` (currently lines 55-61) from `value={ADMIN_EMAIL} readOnly` to a controlled input bound to the new state (`value`/`onChange`, `required`, keep `type="email"`). Pass the state value instead of the constant into `supabase.auth.signInWithPassword({ email, password })`. Do not change the error message on line 28 (`"Login failed. Please check your password and try again."`) — it must stay generic now that the email field is attacker-controlled input, to avoid leaking which addresses are valid admins.

4. **Rollout sequence** (the order the user runs the migration and deploys code — this is operational sequencing, not something the CLI agent executes, but it must be documented in this file for the user):
   1. Apply `007_admin_users_and_rls.sql` via the Supabase SQL editor. The seed step runs before the policy swap within the same file, so the owner is never without a matching `admin_users` row when the new policies take effect.
   2. Immediately after applying, verify the seed worked (see Verification Checklist) before deploying any app code.
   3. Deploy the `app/actions/admin.ts` and `app/admin/login/page.tsx` changes.
   4. Confirm the Supabase Auth signup prerequisite (see above) either before or in the same change window — it is independent of migration/deploy ordering but must not ship open.
   - **Break-glass recovery:** if `admin_users` ever ends up empty (e.g. the seeded owner's `auth.users` row was deleted, cascading via the FK), no one can pass `is_admin()` and the admin UI becomes fully inaccessible through normal login. Recovery: open the Supabase SQL editor (runs with elevated privileges, unaffected by the missing admin) and manually `insert into public.admin_users (user_id, email) values (...)` for a known `auth.users.id`. The delete-guard trigger only fires on `delete`, so this insert path is never blocked.

## Verification Checklist

- [ ] Migration file exists at `supabase/migrations/007_admin_users_and_rls.sql` and was not executed by the CLI agent.
- [ ] `npm run lint` and `npm run type-check` both exit 0 after the `admin.ts` and `login/page.tsx` changes.
- [ ] `app/actions/admin.ts` contains no remaining reference to `ADMIN_EMAIL`.
  ```
  grep -n "ADMIN_EMAIL" app/actions/admin.ts app/admin/login/page.tsx
  ```
  (must return no matches in either file)
- [ ] `app/admin/login/page.tsx`'s email input is no longer `readOnly` and is bound to component state.
- [ ] (Manual, after the user applies the migration via SQL editor) Querying `admin_users` returns exactly one row for the owner:
  ```sql
  select user_id, email from public.admin_users;
  ```
- [ ] (Manual, after the user applies the migration) Policy check confirms all five rewritten policies reference `is_admin()`:
  ```sql
  select tablename, policyname, qual, with_check
  from pg_policies
  where schemaname = 'public'
    and tablename in ('orders', 'products')
  order by tablename, policyname;
  ```
  (`orders_auth_select`, `orders_auth_update`, `products_auth_insert`, `products_auth_update`, `products_auth_delete`, `products_public_select` must all contain `is_admin()`; none may contain a literal email string)
- [ ] (Manual, dashboard) Supabase Auth → Providers → Email confirms public signup is disabled or email confirmation is required.
- [ ] Full spec verification:
  ```
  npm run lint && npm run type-check && grep -rn "ADMIN_EMAIL" app/ || echo "ADMIN_EMAIL fully removed"
  ```
