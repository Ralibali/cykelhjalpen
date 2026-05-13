-- Enforce marketplace quality: max 5 offers per project.
-- This protects the rule at database level even if a client tries to bypass the UI.

create or replace function public.enforce_max_offers_per_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_count integer;
begin
  select count(*)
    into existing_count
    from public.offers
   where project_id = new.project_id;

  if existing_count >= 5 then
    raise exception 'Max 5 offerter är tillåtna per uppdrag.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_max_offers_per_project on public.offers;

create trigger trg_enforce_max_offers_per_project
before insert on public.offers
for each row
execute function public.enforce_max_offers_per_project();

create or replace function public.sync_project_offer_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.projects
       set offer_count = (
         select count(*) from public.offers where project_id = new.project_id
       )
     where id = new.project_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.projects
       set offer_count = (
         select count(*) from public.offers where project_id = old.project_id
       )
     where id = old.project_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_sync_project_offer_count_insert on public.offers;
drop trigger if exists trg_sync_project_offer_count_delete on public.offers;

create trigger trg_sync_project_offer_count_insert
after insert on public.offers
for each row
execute function public.sync_project_offer_count();

create trigger trg_sync_project_offer_count_delete
after delete on public.offers
for each row
execute function public.sync_project_offer_count();
