-- Correct profiles.is_founder to match waitlist founding spots (not mere waitlist presence).
-- Aligns with app logic: founder=true AND confirmed_at IS NOT NULL.

update public.profiles p
set
  is_founder = exists (
    select 1
    from public.waitlist w
    where lower(w.email) = lower(p.email)
      and w.founder = true
      and w.confirmed_at is not null
  ),
  updated_at = now()
where p.is_founder is distinct from exists (
  select 1
  from public.waitlist w
  where lower(w.email) = lower(p.email)
    and w.founder = true
    and w.confirmed_at is not null
);
