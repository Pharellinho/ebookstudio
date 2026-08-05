-- Security hardening for waitlist / rate limits.
-- 1) Email confirmation token (referrals only count after confirm)
-- 2) Longer invite codes enforced at DB
-- 3) Lock down waitlist_stats view
-- 4) Atomic rate-limit bump

alter table public.waitlist
  add column if not exists confirm_token text;

-- Backfill tokens for existing rows (random 32 hex chars via gen_random_uuid stripping dashes + extra).
update public.waitlist
set confirm_token = replace(gen_random_uuid()::text, '-', '') || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
where confirm_token is null;

alter table public.waitlist
  alter column confirm_token set not null;

create unique index if not exists waitlist_confirm_token_idx
  on public.waitlist (confirm_token);

-- Prefer 32-char hex invite codes going forward (legacy 8-char rows still valid).
alter table public.waitlist
  drop constraint if exists waitlist_code_format;
alter table public.waitlist
  add constraint waitlist_code_format check (code ~ '^[a-f0-9]{8,64}$');

-- Aggregate view must not be readable by anon (bypasses RLS).
revoke all on public.waitlist_stats from public, anon, authenticated;

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
begin
  select r.count, r.window_start
    into v_count, v_window_start
  from public.api_rate_limits r
  where r.key = p_key
  for update;

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
