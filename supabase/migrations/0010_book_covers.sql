-- Cover generation. The AI produces only the illustration (cover_art_url is a
-- path inside the private "covers" storage bucket); our code composes the
-- typography on top. cover_url stays the final rasterised cover.

alter table public.books
  add column if not exists cover_art_url text,
  add column if not exists cover_layout text not null default 'centered',
  add column if not exists cover_art_count int not null default 0,
  add column if not exists cover_author text;

-- Private bucket: covers carry the book title, and a draft must not be
-- guessable by anyone trying identifiers. Access is by short-lived signed URL.
insert into storage.buckets (id, name, public)
values ('covers', 'covers', false)
on conflict (id) do nothing;
