-- Audit 1.7 / 1.9: the privacy policy promises deletion of order PII after
-- two years, but nothing enforced it - orders accumulated indefinitely with
-- full name, email and phone. Singapore IRAS separately requires business
-- records be kept five years, which conflicts with a flat two-year delete.
--
-- Split-clock retention: this migration only ever nulls the three PII
-- columns (customer_name, customer_email, customer_phone) on orders older
-- than two years. order_ref, total_price, order_items and created_at are
-- never touched, so the five-year financial record required by IRAS stays
-- intact on the same row.

alter table public.orders
  alter column customer_name drop not null,
  alter column customer_email drop not null,
  alter column customer_phone drop not null;

create or replace function public.anonymize_old_orders()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
  set customer_name = null,
      customer_email = null,
      customer_phone = null
  where created_at < now() - interval '2 years'
    and customer_email is not null;
end;
$$;

revoke all on function public.anonymize_old_orders() from public;

-- pg_cron has to be turned on for the project first (Supabase dashboard ->
-- Database -> Extensions -> pg_cron) on most projects; this is a no-op once
-- that's done, so it's safe to leave in for re-runs.
create extension if not exists pg_cron;

-- cron.schedule() errors on a duplicate job name rather than replacing it,
-- so drop any existing schedule with this name before recreating it -
-- keeps this migration safe to run more than once.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'anonymize-old-orders') then
    perform cron.unschedule('anonymize-old-orders');
  end if;
end;
$$;

-- Daily at 03:00 UTC (11:00 SGT).
select cron.schedule(
  'anonymize-old-orders',
  '0 3 * * *',
  $$ select public.anonymize_old_orders(); $$
);
