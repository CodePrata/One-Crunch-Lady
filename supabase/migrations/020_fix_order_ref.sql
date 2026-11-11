-- Audit 2026-11 B-5 / Q-5: generate_order_ref() fixes.
--
-- 1. lpad(text, 4, '0') TRUNCATES longer strings: id 10003 became '1000',
--    so from order id 10000 on, nine in every ten inserts in a month would
--    collide on the order_ref unique constraint. The width now grows with
--    the id (OCL-YYMM-0042, ..., OCL-YYMM-10003).
-- 2. YYMM came from UTC now(), so an order placed before 08:00 SGT on the
--    1st carried the previous month. It's now computed in Asia/Singapore.
--
-- Format stays OCL-YYMM-XXXX. Existing refs are not rewritten. The trigger
-- itself (trg_orders_generate_order_ref, 002) is unchanged.

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
      to_char(coalesce(new.created_at, now()) at time zone 'Asia/Singapore', 'YYMM'),
      lpad(new.id::text, greatest(4, length(new.id::text)), '0')
    );
  end if;

  return new;
end;
$$;

-- Trigger function only; nobody should call it over the REST API.
revoke execute on function public.generate_order_ref() from public, anon, authenticated;
