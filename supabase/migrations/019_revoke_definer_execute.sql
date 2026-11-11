-- Audit 2026-11 S-4: SECURITY DEFINER functions were callable by anon.
--
-- 010/015/016 ran `revoke all ... from public`, but Supabase grants EXECUTE
-- on new public-schema functions to anon, authenticated and service_role
-- *explicitly* (default privileges), and revoking from the PUBLIC pseudo-
-- role never removes an explicit grant. So anyone holding the public anon
-- key could POST /rest/v1/rpc/reorder_faq_items, claim_promo_redemption or
-- anonymize_old_orders. This revokes from the real roles.
--
-- Pattern for every future function (see CLAUDE.md):
--   revoke execute on function public.f(...) from public, anon, authenticated;
--   grant execute on function public.f(...) to service_role;
--
-- public.is_admin() is deliberately NOT revoked from anon: the public
-- select policies (e.g. products_public_select in 007) call it, and
-- Postgres checks EXECUTE on functions referenced by a policy, so revoking
-- it would break every anonymous REST read of those tables. For anon it
-- just returns false (auth.uid() is null), so leaving it callable is safe.

revoke execute on function public.claim_promo_redemption(uuid) from public, anon, authenticated;
grant execute on function public.claim_promo_redemption(uuid) to service_role;

revoke execute on function public.reorder_faq_items(uuid[]) from public, anon, authenticated;
grant execute on function public.reorder_faq_items(uuid[]) to service_role;

-- Only pg_cron (running as postgres, the owner) calls this.
revoke execute on function public.anonymize_old_orders() from public, anon, authenticated;

-- Stop functions created later by this role from inheriting the default
-- anon/authenticated grant. Any future function that authenticated users
-- really need (like is_admin) must be granted explicitly.
alter default privileges in schema public revoke execute on functions from anon, authenticated;

-- Check (read-only): every row should show anon_can_execute = false and
-- authenticated_can_execute = false.
select
  p.proname as function_name,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('claim_promo_redemption', 'reorder_faq_items', 'anonymize_old_orders');
