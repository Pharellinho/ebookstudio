-- Billing state, written only by the Stripe webhook and the checkout return.
-- `plan` is what the app gates on; the rest is shown on the account page.
alter table public.profiles
  add column if not exists plan text not null default 'free',
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text,
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false;

alter table public.profiles
  drop constraint if exists profiles_plan_check;
alter table public.profiles
  add constraint profiles_plan_check check (plan in ('free', 'studio', 'studio_plus'));

create index if not exists profiles_stripe_customer_idx on public.profiles (stripe_customer_id);
