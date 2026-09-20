-- coloring_pages was created in 0013 without row level security, the only
-- table of the schema in that state. Same posture as books and chapters in
-- 0007: the app reads and writes through the service role, which bypasses
-- RLS, and the anon and authenticated roles get nothing at all.

alter table public.coloring_pages enable row level security;

revoke all on public.coloring_pages from anon, authenticated;
