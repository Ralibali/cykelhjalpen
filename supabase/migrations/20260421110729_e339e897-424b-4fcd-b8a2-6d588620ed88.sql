-- Enable extensions for scheduled background jobs
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Article queue table for content planning + bulk generation
create table if not exists public.article_queue (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  target_keyword text not null,
  category text not null,
  city text,
  article_type text not null default 'guide',
  search_intent text,
  estimated_difficulty text,
  why_this_topic text,
  suggested_length int not null default 5000,
  status text not null default 'queued',
    -- queued | generating | ready_for_review | published | skipped
  priority int not null default 0,
  publish_at timestamptz,
  retry_count int not null default 0,
  last_error text,
  generated_article_id uuid references public.articles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helpful indexes for queue processing
create index if not exists article_queue_status_priority_idx
  on public.article_queue (status, priority desc, created_at asc);
create index if not exists article_queue_publish_at_idx
  on public.article_queue (publish_at) where publish_at is not null;

-- updated_at trigger reuses existing helper
create trigger article_queue_set_updated_at
  before update on public.article_queue
  for each row execute function public.update_updated_at_column();

-- RLS — only admins
alter table public.article_queue enable row level security;

create policy "Admin reads article_queue"
  on public.article_queue for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "Admin inserts article_queue"
  on public.article_queue for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

create policy "Admin updates article_queue"
  on public.article_queue for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Admin deletes article_queue"
  on public.article_queue for delete
  to authenticated
  using (public.is_admin(auth.uid()));