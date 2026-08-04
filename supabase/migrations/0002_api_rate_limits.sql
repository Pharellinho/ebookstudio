-- Durable rate limits for serverless API routes (waitlist, etc.).
create table if not exists public.api_rate_limits (
  key text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

create index if not exists api_rate_limits_window_start_idx
  on public.api_rate_limits (window_start);

alter table public.api_rate_limits enable row level security;

revoke all on public.api_rate_limits from anon, authenticated;
