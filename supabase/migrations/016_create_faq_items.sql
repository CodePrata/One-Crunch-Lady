-- Admin-editable FAQ shown on /faq. Mirrors promotion_banners' RLS shape
-- (013_create_promotion_banners.sql): public can read published items,
-- only admins (public.is_admin()) can write. Server code reaches this
-- table through the service-role client either way (bypasses RLS - see
-- CLAUDE.md's "Supabase client layering" note), so these policies are
-- what actually protects the browser anon client, not app code.

create table if not exists public.faq_items (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.faq_items enable row level security;

drop policy if exists "faq_items_public_select" on public.faq_items;
create policy "faq_items_public_select"
on public.faq_items
for select
to public
using (is_published = true or public.is_admin());

drop policy if exists "faq_items_auth_insert" on public.faq_items;
create policy "faq_items_auth_insert"
on public.faq_items
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "faq_items_auth_update" on public.faq_items;
create policy "faq_items_auth_update"
on public.faq_items
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "faq_items_auth_delete" on public.faq_items;
create policy "faq_items_auth_delete"
on public.faq_items
for delete
to authenticated
using (public.is_admin());

-- Serves both the public /faq read (published items, sorted) and the
-- admin panel's full list (all items, sorted).
create index if not exists idx_faq_items_published_sort
on public.faq_items (is_published, sort_order);

-- Atomic reorder: rewrites every listed item's sort_order to its
-- position in `ids` in a single statement, so a ▲/▼ move in the admin
-- panel can never leave two items half-swapped. The Supabase JS client
-- can't express this as one update, hence a SQL function.
-- security definer + service_role-only grant, same as
-- claim_promo_redemption (015_create_promo_codes.sql) - only the admin
-- server action (app/actions/admin.ts's reorderFaqItems) calls it.
create or replace function public.reorder_faq_items(ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.faq_items f
  set sort_order = t.ord, updated_at = now()
  from unnest(ids) with ordinality as t(id, ord)
  where f.id = t.id;
$$;

revoke all on function public.reorder_faq_items(uuid[]) from public;
grant execute on function public.reorder_faq_items(uuid[]) to service_role;

-- Starter content: the placeholder (Lorem Ipsum) entries that were
-- previously hardcoded in app/(storefront)/faq/page.tsx, for the client
-- to replace via the admin FAQ tab. Only inserted while the table is
-- empty, so re-running this file never duplicates them - and never
-- re-adds them once the client has deleted them and added real ones.
insert into public.faq_items (question, answer, sort_order)
select v.question, v.answer, v.sort_order
from (
  values
    (
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit?',
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
      1
    ),
    (
      'Duis aute irure dolor in reprehenderit in voluptate?',
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      2
    ),
    (
      'Sed ut perspiciatis unde omnis iste natus error sit voluptatem?',
      'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
      3
    ),
    (
      'Nemo enim ipsam voluptatem quia voluptas sit aspernatur?',
      'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.',
      4
    ),
    (
      'At vero eos et accusamus et iusto odio dignissimos?',
      'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.',
      5
    ),
    (
      'Et harum quidem rerum facilis est et expedita distinctio?',
      'Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus.',
      6
    )
) as v(question, answer, sort_order)
where not exists (select 1 from public.faq_items);
