-- Audit 4.6: createOrder's per-email and per-phone cooldown checks
-- (app/actions/orders.ts) filter on customer_email/customer_phone and
-- created_at, but neither column pair was indexed - both queries do a
-- sequential scan that gets slower as the orders table grows.

create index if not exists idx_orders_customer_email_created_at
on public.orders (customer_email, created_at);

create index if not exists idx_orders_customer_phone_created_at
on public.orders (customer_phone, created_at);
