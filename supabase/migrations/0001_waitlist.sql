-- Waitlist for the pre-launch page.
-- Positions are derived from created_at rather than stored, so nothing has to
-- be renumbered when a row is removed.
--
-- Invitations / referrals:
--   - each row gets a unique `code` used in /?ref=<code>
--   - `referred_by` points at the inviter's code (FK → waitlist.code)
--   - effective position = raw join rank − (referral_count × 10), min 1
--   - bonus credits and free-year thresholds are computed in app code

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  code text not null unique,
  referred_by text references public.waitlist (code) on delete set null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  founder boolean not null default false,
  reservation_payment_id text,
  source text,
  ip_hash text
);

create index if not exists waitlist_created_at_idx on public.waitlist (created_at);
create index if not exists waitlist_referred_by_idx on public.waitlist (referred_by);

alter table public.waitlist enable row level security;

-- No anonymous reads or writes: signups go through a server route using the
-- service role key, so the list can never be scraped from the browser.
revoke all on public.waitlist from anon, authenticated;

create or replace view public.waitlist_stats as
select
  count(*)::int as total,
  count(*) filter (where confirmed_at is not null)::int as confirmed
from public.waitlist;
