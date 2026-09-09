-- Closes the order-success enumeration hole (audit 4.1): the success page
-- looked up an order by order_ref alone, and order_ref's last segment is a
-- zero-padded sequential id, so any order this month could be read by
-- counting. A random per-order token, required as a query param alongside
-- order_ref, makes the URL unguessable while leaving order_ref (used in
-- emails/WhatsApp/admin) untouched.

alter table public.orders
add column if not exists access_token uuid not null default gen_random_uuid();

create unique index if not exists idx_orders_access_token
on public.orders (access_token);
