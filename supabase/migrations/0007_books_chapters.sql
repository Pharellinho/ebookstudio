-- Books and chapters for the generation pipeline.
-- App uses service role + Clerk user id checks (no anon access).

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles (id) on delete cascade,
  idea text not null,
  format_slug text not null,
  title text,
  subtitle text,
  status text not null default 'draft'
    check (status in ('draft', 'outlining', 'writing', 'ready', 'failed')),
  outline jsonb,
  cover_url text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists books_user_id_idx on public.books (user_id);
create index if not exists books_status_idx on public.books (status);
create index if not exists books_created_at_idx on public.books (created_at desc);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  position int not null,
  title text not null default '',
  body text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'writing', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, position)
);

create index if not exists chapters_book_id_idx on public.chapters (book_id);

alter table public.books enable row level security;
alter table public.chapters enable row level security;

revoke all on public.books from anon, authenticated;
revoke all on public.chapters from anon, authenticated;
