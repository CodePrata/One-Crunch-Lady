-- Audit 2026-11 S-1 / S-3 / B-11: per-IP (and per-email / site-wide) rate
-- limits for the public server actions (createOrder, validatePromoCode,
-- submitContactMessage). Keys are built and SHA-256 hashed in
-- lib/rate-limit.ts, so no raw IP address is ever stored here.
--
-- Fixed-window counter: one row per (key, window bucket). hit_rate_limit()
-- increments atomically (insert ... on conflict do update) and returns
-- whether this hit is still within p_max.

create table if not exists public.rate_limits (
  key text not null,
  bucket timestamptz not null,
  hits integer not null default 0,
  primary key (key, bucket)
);

-- RLS on with no policies: only the service-role client (server actions)
-- touches this table.
alter table public.rate_limits enable row level security;

create or replace function public.hit_rate_limit(p_key text, p_window interval, p_max integer)
returns boolean
language sql
security definer
set search_path = public
as $$
  insert into public.rate_limits as r (key, bucket, hits)
  values (p_key, date_bin(p_window, now(), timestamptz '2000-01-01'), 1)
  on conflict (key, bucket) do update set hits = r.hits + 1
  returning hits <= p_max;
$$;

revoke execute on function public.hit_rate_limit(text, interval, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, interval, integer) to service_role;

-- Daily cleanup: the longest window used is 1 day, so anything older than
-- 2 days is dead weight. cron.schedule errors on a duplicate name, hence
-- the unschedule first (same pattern as 010).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'purge-rate-limits') then
    perform cron.unschedule('purge-rate-limits');
  end if;
end;
$$;

-- Daily at 03:30 UTC (11:30 SGT).
select cron.schedule(
  'purge-rate-limits',
  '30 3 * * *',
  $$ delete from public.rate_limits where bucket < now() - interval '2 days'; $$
);
