-- Audit 2026-11 B-4 / B-3 / Q-6 / DB-3: order lifecycle, audit trail and
-- promo-claim release.
--
-- Run 022_order_status_values.sql FIRST, as its own run - this file uses
-- the CANCELLED / COLLECTED / EXPIRED enum values it adds.
--
-- Status moves (the only ones transition_order_status allows):
--   UNPAID -> PAID       admin: Mark as Paid      (email: Payment Confirmed)
--   PAID   -> READY      admin: Mark as Ready     (email: Ready for Pickup)
--   READY  -> COLLECTED  admin: Mark as Collected (no email)
--   UNPAID/PAID -> CANCELLED  admin: Cancel       (no email; promo use released)
--   UNPAID -> EXPIRED    daily job, after 7 days  (no email; promo use released)

-- 1. When / by whom.
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists ready_at timestamptz;
alter table public.orders add column if not exists closed_at timestamptz;
alter table public.orders add column if not exists status_changed_by uuid;

-- 2. Audit trail: one row per status change. actor is the admin's auth
-- user id, or null for the expiry job.
create table if not exists public.order_events (
  id bigserial primary key,
  order_id integer not null references public.orders(id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  actor uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_events_order_id on public.order_events (order_id);

-- RLS on, no policies: service-role only (same as admin_users/promo_codes).
alter table public.order_events enable row level security;

-- 3. Give back one promo redemption (an order that was cancelled, expired,
-- or never got inserted after its claim). orders only store the code
-- text, so this keys on code. Never goes below 0.
create or replace function public.release_promo_redemption(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.promo_codes
  set redemption_count = greatest(redemption_count - 1, 0)
  where code = p_code::citext;
$$;

revoke execute on function public.release_promo_redemption(text) from public, anon, authenticated;
grant execute on function public.release_promo_redemption(text) to service_role;

-- 4. claim_promo_redemption (015) now also re-checks the date window, so
-- a code that expires between createOrder's JS check and the claim can't
-- slip through (B-3.5). Same signature and return type as before.
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
    and (starts_at is null or starts_at <= now())
    and (expires_at is null or expires_at >= now())
    and (max_redemptions is null or redemption_count < max_redemptions)
  returning *;
$$;

revoke execute on function public.claim_promo_redemption(uuid) from public, anon, authenticated;
grant execute on function public.claim_promo_redemption(uuid) to service_role;

-- 5. Guarded status change. Locks the row, checks the move is allowed
-- from the CURRENT status, updates, logs. Returns the updated row, or no
-- row at all if the move isn't allowed (already done by a double-click or
-- a second tab, or an invalid jump like UNPAID -> READY). The caller
-- (app/actions/admin.ts updateOrderStatus) only sends an email when a row
-- comes back, so duplicates can't happen.
create or replace function public.transition_order_status(
  p_order_id integer,
  p_to public.order_status,
  p_actor uuid
)
returns setof public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed_from public.order_status[];
  v_current public.order_status;
  v_order public.orders;
begin
  v_allowed_from := case p_to
    when 'PAID' then array['UNPAID']::public.order_status[]
    when 'READY' then array['PAID']::public.order_status[]
    when 'COLLECTED' then array['READY']::public.order_status[]
    when 'CANCELLED' then array['UNPAID', 'PAID']::public.order_status[]
    else null
  end;

  if v_allowed_from is null then
    raise exception 'Unsupported target status: %', p_to;
  end if;

  select status into v_current
  from public.orders
  where id = p_order_id
  for update;

  if not found or not (v_current = any (v_allowed_from)) then
    return;
  end if;

  update public.orders
  set status = p_to,
      paid_at = case when p_to = 'PAID' then now() else paid_at end,
      ready_at = case when p_to = 'READY' then now() else ready_at end,
      closed_at = case when p_to in ('COLLECTED', 'CANCELLED') then now() else closed_at end,
      status_changed_by = p_actor
  where id = p_order_id
  returning * into v_order;

  insert into public.order_events (order_id, from_status, to_status, actor)
  values (p_order_id, v_current, p_to, p_actor);

  if p_to = 'CANCELLED' and v_order.promo_code is not null then
    perform public.release_promo_redemption(v_order.promo_code);
  end if;

  return next v_order;
end;
$$;

revoke execute on function public.transition_order_status(integer, public.order_status, uuid)
  from public, anon, authenticated;
grant execute on function public.transition_order_status(integer, public.order_status, uuid)
  to service_role;

-- 6. Expire UNPAID orders older than 7 days, release their promo uses,
-- log each one. Run daily by pg_cron below.
create or replace function public.expire_unpaid_orders()
returns void
language sql
security definer
set search_path = public
as $$
  with expired as (
    update public.orders
    set status = 'EXPIRED', closed_at = now(), status_changed_by = null
    where status = 'UNPAID'
      and created_at < now() - interval '7 days'
    returning id, promo_code
  ),
  logged as (
    insert into public.order_events (order_id, from_status, to_status, actor)
    select id, 'UNPAID', 'EXPIRED', null from expired
    returning order_id
  )
  update public.promo_codes p
  set redemption_count = greatest(p.redemption_count - c.uses, 0)
  from (
    select promo_code, count(*)::integer as uses
    from expired
    where promo_code is not null
    group by promo_code
  ) c
  where p.code = c.promo_code::citext;
$$;

revoke execute on function public.expire_unpaid_orders() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'expire-unpaid-orders') then
    perform cron.unschedule('expire-unpaid-orders');
  end if;
end;
$$;

-- Daily at 16:00 UTC (00:00 SGT).
select cron.schedule(
  'expire-unpaid-orders',
  '0 16 * * *',
  $$ select public.expire_unpaid_orders(); $$
);

-- 7. Integrity checks (Q-6, DB-3). NOT VALID: enforced for every new or
-- updated row, without re-checking existing rows.
alter table public.orders drop constraint if exists orders_total_matches_subtotal_check;
alter table public.orders
  add constraint orders_total_matches_subtotal_check
  check (subtotal is null or total_price = subtotal - discount_amount) not valid;

alter table public.orders drop constraint if exists orders_order_items_array_check;
alter table public.orders
  add constraint orders_order_items_array_check
  check (jsonb_typeof(order_items) = 'array') not valid;

-- Check (read-only): the three cron jobs and the new columns.
select jobname, schedule, active from cron.job order by jobname;
