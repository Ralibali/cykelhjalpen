-- Marketplace foundations for lower buyer friction, lead quality and admin health.
-- Adds guest leads, lead quality scoring, category supply/demand view and supplier notifications.

create table if not exists public.guest_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  company_name text,
  phone text,
  title text not null,
  description text not null,
  category text not null,
  budget_range text,
  start_time text,
  is_company boolean default true,
  status text not null default 'unclaimed',
  claimed_by uuid references auth.users(id) on delete set null,
  converted_project_id uuid references public.projects(id) on delete set null,
  source text default 'publicera',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guest_leads_email_idx on public.guest_leads(lower(email));
create index if not exists guest_leads_status_idx on public.guest_leads(status);
create index if not exists guest_leads_category_idx on public.guest_leads(category);

alter table public.guest_leads enable row level security;

drop policy if exists "Anyone can create guest leads" on public.guest_leads;
create policy "Anyone can create guest leads"
on public.guest_leads
for insert
to anon, authenticated
with check (true);

drop policy if exists "Admins can read guest leads" on public.guest_leads;
create policy "Admins can read guest leads"
on public.guest_leads
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "Lead owner can read own guest leads" on public.guest_leads;
create policy "Lead owner can read own guest leads"
on public.guest_leads
for select
to authenticated
using (claimed_by = auth.uid() or lower(email) = lower((auth.jwt() ->> 'email')));

create or replace function public.touch_guest_leads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_guest_leads_updated_at on public.guest_leads;
create trigger trg_touch_guest_leads_updated_at
before update on public.guest_leads
for each row execute function public.touch_guest_leads_updated_at();

-- Lead quality view used by admin and supplier UX.
create or replace view public.project_lead_quality as
select
  p.id as project_id,
  p.title,
  p.category,
  p.budget_range,
  p.start_time,
  p.status,
  p.offer_count,
  p.created_at,
  least(100,
    case when length(coalesce(p.description, '')) >= 500 then 30
         when length(coalesce(p.description, '')) >= 220 then 20
         when length(coalesce(p.description, '')) >= 80 then 10
         else 0 end
    + case when p.budget_range is not null and p.budget_range <> 'unknown' then 25 else 0 end
    + case when p.start_time in ('asap', 'within_month') then 20
           when p.start_time is not null then 10 else 0 end
    + case when p.is_company then 15 else 0 end
    + case when coalesce(p.offer_count, 0) < 3 then 10 else 0 end
  ) as lead_score,
  case
    when least(100,
      case when length(coalesce(p.description, '')) >= 500 then 30
           when length(coalesce(p.description, '')) >= 220 then 20
           when length(coalesce(p.description, '')) >= 80 then 10
           else 0 end
      + case when p.budget_range is not null and p.budget_range <> 'unknown' then 25 else 0 end
      + case when p.start_time in ('asap', 'within_month') then 20
             when p.start_time is not null then 10 else 0 end
      + case when p.is_company then 15 else 0 end
      + case when coalesce(p.offer_count, 0) < 3 then 10 else 0 end
    ) >= 75 then 'high'
    when least(100,
      case when length(coalesce(p.description, '')) >= 500 then 30
           when length(coalesce(p.description, '')) >= 220 then 20
           when length(coalesce(p.description, '')) >= 80 then 10
           else 0 end
      + case when p.budget_range is not null and p.budget_range <> 'unknown' then 25 else 0 end
      + case when p.start_time in ('asap', 'within_month') then 20
             when p.start_time is not null then 10 else 0 end
      + case when p.is_company then 15 else 0 end
      + case when coalesce(p.offer_count, 0) < 3 then 10 else 0 end
    ) >= 45 then 'medium'
    else 'low'
  end as lead_quality
from public.projects p;

-- Category health: shows categories with demand but too few suppliers.
create or replace view public.marketplace_category_health as
with project_demand as (
  select category, count(*) as open_projects
  from public.projects
  where status in ('pending', 'open', 'approved')
  group by category
), supplier_supply as (
  select category, count(distinct sp.id) as active_suppliers
  from public.supplier_profiles sp
  cross join lateral unnest(coalesce(sp.categories, array[]::text[])) as category
  group by category
)
select
  coalesce(d.category, s.category) as category,
  coalesce(d.open_projects, 0) as open_projects,
  coalesce(s.active_suppliers, 0) as active_suppliers,
  case
    when coalesce(d.open_projects, 0) > 0 and coalesce(s.active_suppliers, 0) = 0 then 'pause_or_recruit'
    when coalesce(d.open_projects, 0) >= 3 and coalesce(s.active_suppliers, 0) < 2 then 'low_supply'
    when coalesce(s.active_suppliers, 0) >= 3 then 'healthy'
    else 'watch'
  end as health_status
from project_demand d
full outer join supplier_supply s on s.category = d.category;

create table if not exists public.supplier_notifications (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  type text not null default 'new_matching_lead',
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists supplier_notifications_supplier_idx on public.supplier_notifications(supplier_id, read_at, created_at desc);

alter table public.supplier_notifications enable row level security;

drop policy if exists "Suppliers can read own notifications" on public.supplier_notifications;
create policy "Suppliers can read own notifications"
on public.supplier_notifications
for select
to authenticated
using (supplier_id = auth.uid());

drop policy if exists "Suppliers can update own notifications" on public.supplier_notifications;
create policy "Suppliers can update own notifications"
on public.supplier_notifications
for update
to authenticated
using (supplier_id = auth.uid())
with check (supplier_id = auth.uid());

create or replace function public.notify_matching_suppliers_for_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.supplier_notifications (supplier_id, project_id, title, body)
  select
    sp.id,
    new.id,
    'Nytt matchande lead: ' || new.title,
    'Ett nytt uppdrag inom ' || coalesce(new.category, 'din kategori') || ' matchar din byråprofil.'
  from public.supplier_profiles sp
  where coalesce(sp.categories, array[]::text[]) @> array[new.category]
  limit 25;

  return new;
end;
$$;

drop trigger if exists trg_notify_matching_suppliers_for_project on public.projects;
create trigger trg_notify_matching_suppliers_for_project
after insert on public.projects
for each row
execute function public.notify_matching_suppliers_for_project();
