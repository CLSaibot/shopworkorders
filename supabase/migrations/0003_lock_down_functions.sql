-- Functions get EXECUTE for PUBLIC by default; only signed-in users should reach the API ones.
revoke execute on all functions in schema public from public, anon;

-- Internal-only: triggers and helpers called from inside other functions.
revoke execute on function public.tg_part_stock() from authenticated;
revoke execute on function public.tg_work_order_created() from authenticated;
revoke execute on function public.require_manager() from authenticated;

-- Callable by signed-in users (each checks the caller's role itself).
grant execute on function public.is_manager() to authenticated;  -- used by row-level security policies
grant execute on function public.log_hours(bigint, numeric, text) to authenticated;
grant execute on function public.check_in_work_order(bigint, numeric) to authenticated;
grant execute on function public.start_work(bigint, numeric) to authenticated;
grant execute on function public.pause_work(bigint, text) to authenticated;
grant execute on function public.complete_work(bigint, text) to authenticated;
grant execute on function public.cancel_work_order(bigint, text) to authenticated;
grant execute on function public.reopen_work_order(bigint) to authenticated;
grant execute on function public.shop_report(timestamptz, timestamptz) to authenticated;

-- Future functions: don't auto-grant to anon.
alter default privileges in schema public revoke execute on functions from public, anon;
