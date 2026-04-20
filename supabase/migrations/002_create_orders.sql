do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'order_status'
  ) then
    create type public.order_status as enum ('UNPAID', 'PAID', 'READY');
  end if;
end
$$;

create table if not exists public.orders (
  id serial primary key,
  order_ref text not null unique,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  order_items jsonb not null default '[]'::jsonb,
  total_price numeric(10, 2) not null check (total_price >= 0),
  status public.order_status not null default 'UNPAID',
  created_at timestamptz not null default now()
);

create or replace function public.generate_order_ref()
returns trigger
language plpgsql
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

drop trigger if exists trg_orders_generate_order_ref on public.orders;

create trigger trg_orders_generate_order_ref
before insert on public.orders
for each row
execute function public.generate_order_ref();
