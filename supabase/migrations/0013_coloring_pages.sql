-- The pages of a coloring book: one row per page, drawn one at a time by the
-- image model. image_path points into the private "covers" bucket, under
-- <user>/<book>/pages/. stale is set when the plan line changed after the
-- picture was drawn, so the studio can offer a redraw.

create table if not exists public.coloring_pages (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  position int not null,
  scene text not null,
  detail text not null default '',
  status text not null default 'pending' check (status in ('pending', 'drawing', 'ready', 'failed')),
  image_path text,
  redraws int not null default 0,
  stale boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, position)
);

create index if not exists coloring_pages_book_idx on public.coloring_pages (book_id, position);
