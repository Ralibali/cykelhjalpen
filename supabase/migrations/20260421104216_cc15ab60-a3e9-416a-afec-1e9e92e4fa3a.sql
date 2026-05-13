create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  meta_title text not null,
  meta_desc text not null,
  h1 text not null,
  category text not null,
  article_type text not null default 'guide',
  city text,
  target_keyword text,
  published_date date not null default current_date,
  updated_date date not null default current_date,
  read_time_minutes int,
  intro text not null,
  sections jsonb not null default '[]'::jsonb,
  faq jsonb not null default '[]'::jsonb,
  related_links jsonb not null default '[]'::jsonb,
  author_name text not null default 'Christoffer Daranyi',
  author_role text not null default 'Grundare, Updro',
  status text not null default 'draft',
  generated_by text default 'gemini-2.5-pro',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_articles_status on public.articles(status);
create index idx_articles_category on public.articles(category);
create index idx_articles_published_date on public.articles(published_date desc);

alter table public.articles enable row level security;

create policy "Public read published articles"
  on public.articles for select
  using (status = 'published');

create policy "Admin reads all articles"
  on public.articles for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "Admin inserts articles"
  on public.articles for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

create policy "Admin updates articles"
  on public.articles for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Admin deletes articles"
  on public.articles for delete
  to authenticated
  using (public.is_admin(auth.uid()));

create trigger update_articles_updated_at
  before update on public.articles
  for each row execute function public.update_updated_at_column();