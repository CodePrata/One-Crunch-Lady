-- Audit 2026-11 B-4: order lifecycle statuses.
--
-- RUN THIS FILE ON ITS OWN, before 023. Postgres won't let a transaction
-- use an enum value it added itself, and the SQL editor runs a pasted
-- script as one transaction - 023 uses these values.
--
--   CANCELLED - owner cancelled it (from UNPAID or PAID; any refund is
--               handled by hand, outside this app)
--   COLLECTED - customer picked it up (from READY)
--   EXPIRED   - UNPAID for more than 7 days; set by the daily
--               expire-unpaid-orders job in 023

alter type public.order_status add value if not exists 'CANCELLED';
alter type public.order_status add value if not exists 'COLLECTED';
alter type public.order_status add value if not exists 'EXPIRED';
