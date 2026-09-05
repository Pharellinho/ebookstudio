-- Each book carries one accent colour for its interior (chapter openers,
-- section rules, pull quotes, table headers). Assigned by format at creation;
-- existing rows fall back to the honey accent of the design system.

alter table public.books
  add column if not exists accent text not null default '#b8860b';
