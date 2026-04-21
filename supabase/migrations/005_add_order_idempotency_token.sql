alter table public.orders
add column if not exists idempotency_token uuid;

create unique index if not exists idx_orders_idempotency_token
on public.orders (idempotency_token)
where idempotency_token is not null;
