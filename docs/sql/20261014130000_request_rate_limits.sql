-- Atomic, service-role-only buckets used by lib/rate-limit.ts.
create table if not exists public.request_rate_limits (
  bucket_key text primary key,
  request_count integer not null,
  reset_at timestamptz not null
);
alter table public.request_rate_limits enable row level security;
revoke all on public.request_rate_limits from anon, authenticated;
grant all on public.request_rate_limits to service_role;
create index if not exists request_rate_limits_reset_at_idx on public.request_rate_limits(reset_at);

create or replace function public.check_rate_limit_db(
  p_key text, p_max_requests integer, p_window_seconds integer
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  current_time_value timestamptz := clock_timestamp();
  resulting_count integer;
begin
  if p_key is null or p_max_requests is null or p_window_seconds is null
     or length(p_key) > 512 or p_max_requests not between 1 and 100000
     or p_window_seconds not between 1 and 86400 then
    raise exception 'Invalid rate limit parameters';
  end if;
  insert into public.request_rate_limits as buckets (bucket_key, request_count, reset_at)
  values (p_key, 1, current_time_value + make_interval(secs => p_window_seconds))
  on conflict (bucket_key) do update set
    request_count = case when buckets.reset_at <= current_time_value then 1
                         else least(buckets.request_count + 1, p_max_requests + 1) end,
    reset_at = case when buckets.reset_at <= current_time_value
                    then current_time_value + make_interval(secs => p_window_seconds)
                    else buckets.reset_at end
  returning request_count into resulting_count;
  return resulting_count <= p_max_requests;
end;
$$;
revoke all on function public.check_rate_limit_db(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit_db(text, integer, integer) to service_role;
-- Expired buckets may be removed by normal maintenance:
-- delete from public.request_rate_limits where reset_at < now() - interval '1 day';
