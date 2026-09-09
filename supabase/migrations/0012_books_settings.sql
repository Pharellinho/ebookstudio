-- Per-format settings that the outline cannot carry: for a coloring book,
-- the age band, the line style, the page size. Null for ebooks.

alter table public.books
  add column if not exists settings jsonb;
