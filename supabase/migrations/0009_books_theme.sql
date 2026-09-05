-- The author's chosen interior theme (one of the three variations of the
-- format's identity, see src/lib/book-design.ts). Null means "the default
-- for this book", which is derived from the book id and never changes.

alter table public.books
  add column if not exists theme text;
