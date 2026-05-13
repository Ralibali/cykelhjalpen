
create or replace function public.close_project_on_max_offers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.offers where project_id = NEW.project_id) >= 5 then
    update public.projects set status = 'closed' where id = NEW.project_id;
  end if;
  return NEW;
end;
$$;

create trigger check_max_offers
after insert on public.offers
for each row execute function public.close_project_on_max_offers();
