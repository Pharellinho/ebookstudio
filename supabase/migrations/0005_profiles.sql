-- Product profiles synced from Clerk (id = Clerk user id).
-- App code uses the service role and filters by clerk id; no anon access.

create table if not exists public.profiles (
  id text primary key,
  email text not null,
  display_name text,
  image_url text,
  is_founder boolean not null default false,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_is_founder_idx on public.profiles (is_founder);

alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;
