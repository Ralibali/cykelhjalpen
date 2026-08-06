create or replace function public.grant_lead_credits(p_workshop_id uuid, p_quantity integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'invalid_quantity';
  end if;

  perform set_config('app.grant_leads', 'on', true);

  update public.workshops
     set free_leads_remaining = coalesce(free_leads_remaining, 0) + p_quantity,
         updated_at = now()
   where id = p_workshop_id
  returning free_leads_remaining into v_total;

  if v_total is null then
    raise exception 'workshop_not_found';
  end if;

  return v_total;
end;
$$;

revoke all on function public.grant_lead_credits(uuid, integer) from public;
revoke all on function public.grant_lead_credits(uuid, integer) from anon;
revoke all on function public.grant_lead_credits(uuid, integer) from authenticated;
grant execute on function public.grant_lead_credits(uuid, integer) to service_role;