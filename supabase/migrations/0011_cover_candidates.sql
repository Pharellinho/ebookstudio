-- Full covers are generated three at a time; the author picks one.
-- cover_candidates: every generated cover, as paths in the private "covers"
-- bucket. cover_url: the chosen one (a path in the same bucket).
-- cover_runs: number of three-cover runs spent, for the per-book cap.

alter table public.books
  add column if not exists cover_candidates jsonb not null default '[]'::jsonb,
  add column if not exists cover_runs int not null default 0;
