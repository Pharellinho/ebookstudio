-- Make bump_rate_limit race-safe under concurrent first hits.
create or replace function public.bump_rate_limit(
  p_key text,
  p_limit int,
  p_window_seconds int
)
returns table (allowed boolean, remaining int, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count int;
  v_window_start timestamptz;
  v_reset timestamptz;
  v_lock_key bigint := hashtextextended(p_key, 0);
begin
  perform pg_advisory_xact_lock(v_lock_key);

  select r.count, r.window_start
    into v_count, v_window_start
  from public.api_rate_limits r
  where r.key = p_key;

  if not found
     or v_window_start + make_interval(secs => p_window_seconds) <= v_now then
    insert into public.api_rate_limits (key, count, window_start)
    values (p_key, 1, v_now)
    on conflict (key) do update
      set count = 1,
          window_start = excluded.window_start;
    allowed := true;
    remaining := greatest(p_limit - 1, 0);
    reset_at := v_now + make_interval(secs => p_window_seconds);
    return next;
    return;
  end if;

  v_count := v_count + 1;
  update public.api_rate_limits
     set count = v_count
   where key = p_key;

  v_reset := v_window_start + make_interval(secs => p_window_seconds);
  allowed := v_count <= p_limit;
  remaining := greatest(p_limit - v_count, 0);
  reset_at := v_reset;
  return next;
end;
$$;

revoke all on function public.bump_rate_limit(text, int, int) from public, anon, authenticated;
