-- Additive service workspace. Rollback: remove navigation/RPC grants; retain orders and history.
-- Does not change winner-fee, contact-unlock, outcome, subscription or city-state behavior.
create table public.v2_service_orders (
 id uuid primary key,workshop_id uuid not null references public.workshops(id),
 source_response_id uuid unique references public.workshop_responses(id) on delete set null,
 create_request jsonb not null,customer jsonb not null,bike text not null,frame_number text,description text not null,
 status text not null default 'intake' check(status in('intake','awaiting_approval','approved','in_progress','ready','collected','cancelled')),
 quotes jsonb not null default '[]',history jsonb not null default '[]',revision integer not null default 1,
 token_hash text,token_expires_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index v2_service_orders_workshop_updated on public.v2_service_orders(workshop_id,updated_at desc);
create unique index v2_service_orders_token on public.v2_service_orders(token_hash) where token_hash is not null;
alter table public.v2_service_orders enable row level security;
create policy "v2_service_orders_owner_read" on public.v2_service_orders for select to authenticated
 using(exists(select 1 from public.workshops w where w.id=workshop_id and w.user_id=auth.uid() and w.approved));
revoke all on public.v2_service_orders from anon,authenticated;
grant select on public.v2_service_orders to authenticated;

create or replace function public.v2_service_order_owner(p_action text,p_id uuid,p_revision integer default null,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare w public.workshops;r public.v2_service_orders; response public.workshop_responses; req public.bike_repair_requests; quote jsonb; event jsonb; v_token uuid; customer jsonb; next_status text; price bigint;
begin
 if auth.uid() is null then raise exception 'Logga in'; end if;
 select * into w from public.workshops where user_id=auth.uid() and approved;
 if not found then raise exception 'Ett godkänt verkstadskonto krävs'; end if;
 if p_id is null or p_data is null or jsonb_typeof(p_data)<>'object' or length(p_data::text)>16000 then raise exception 'Ogiltiga uppgifter'; end if;
 perform pg_advisory_xact_lock(hashtextextended(w.id::text,724));
 select * into r from public.v2_service_orders where id=p_id for update;
 if p_action='create' then
  if found then
   if r.workshop_id<>w.id then raise exception 'Arbetsordern saknas'; end if;
   if r.create_request is distinct from p_data then raise exception 'Arbetsordern är redan skapad. Öppna den i listan.'; end if;
   return to_jsonb(r)-'token_hash';
  end if;
  if nullif(p_data->>'response_id','') is not null then
   select * into response from public.workshop_responses where id=(p_data->>'response_id')::uuid and workshop_id=w.id and status='won' and paid for share;
   if not found then raise exception 'Uppdraget måste vara vunnet och kundkontakten upplåst'; end if;
   select * into r from public.v2_service_orders where source_response_id=response.id;
   if found then return to_jsonb(r)-'token_hash'; end if;
   select * into req from public.bike_repair_requests where id=response.request_id;
   customer:=jsonb_build_object('name',req.customer_name,'email',req.customer_email,'phone',req.customer_phone);
  else
   customer:=jsonb_build_object('name',trim(p_data->>'name'),'email',nullif(trim(p_data->>'email'),''),'phone',nullif(trim(p_data->>'phone'),''));
  end if;
  if coalesce(length(customer->>'name'),0) not between 1 and 200 or (coalesce(length(customer->>'email'),0)=0 and coalesce(length(customer->>'phone'),0)=0) or length(customer::text)>1000 then raise exception 'Ange kundens namn och e-post eller telefon'; end if;
  if coalesce(length(trim(coalesce(req.bike_type,p_data->>'bike'))),0) not between 1 and 200 or coalesce(length(trim(coalesce(req.description,p_data->>'description'))),0) not between 1 and 5000 then raise exception 'Ange cykel och vad som ska göras'; end if;
  insert into public.v2_service_orders(id,workshop_id,source_response_id,customer,bike,frame_number,description,history,create_request)
  values(p_id,w.id,response.id,customer,trim(coalesce(req.bike_type,p_data->>'bike')),nullif(left(trim(p_data->>'frame_number'),200),''),trim(coalesce(req.description,p_data->>'description')),jsonb_build_array(jsonb_build_object('kind','created','label','Arbetsorder skapad','at',now(),'actor','workshop')),p_data)
  returning * into r;
  return to_jsonb(r)-'token_hash';
 end if;
 if r.id is null or r.workshop_id<>w.id then raise exception 'Arbetsordern saknas'; end if;
 if p_revision is distinct from r.revision then raise exception 'Arbetsordern har ändrats. Hämta den senaste versionen och granska igen.'; end if;
 if jsonb_array_length(r.history)>=500 and p_action not in('revoke','status') then raise exception 'Historiken är full. Avsluta arbetsordern.'; end if;
 if p_action='link' then
  if r.status in('collected','cancelled') then raise exception 'Avslutade order kan inte få en ny godkännandelänk'; end if;
  v_token:=(p_data->>'token')::uuid;
  if v_token is null then raise exception 'Länkens identitet saknas'; end if;
  r.token_hash:=encode(sha256(convert_to(v_token::text,'UTF8')),'hex');r.token_expires_at:=now()+interval '90 days';
  event:=jsonb_build_object('kind','link','label','Ny kundlänk skapad','actor','workshop');
 elsif p_action='revoke' then
  r.token_hash:=null;r.token_expires_at:=null;event:=jsonb_build_object('kind','link','label','Kundlänken återkallad','actor','workshop');
 elsif p_action='quote' then
  if r.status not in('intake','awaiting_approval','approved','in_progress') then raise exception 'Prisförslag kan inte ändras i denna status'; end if;
  if coalesce(length(trim(p_data->>'description')),0) not between 1 and 5000 or (p_data->>'price_ore') !~ '^\d+$' then raise exception 'Ange beskrivning och ett fast totalpris inklusive moms'; end if;
  price:=(p_data->>'price_ore')::bigint;if price is null or price<0 or price>100000000 then raise exception 'Ogiltigt totalpris'; end if;
  if jsonb_array_length(r.quotes)>=50 then raise exception 'För många prisversioner'; end if;
  quote:=jsonb_build_object('version',jsonb_array_length(r.quotes)+1,'description',trim(p_data->>'description'),'price_ore',price,'currency','SEK','vat_included',true,'created_at',now(),'decision',null);
  r.quotes:=r.quotes||jsonb_build_array(quote);r.status:='awaiting_approval';
  event:=jsonb_build_object('kind','quote','label','Nytt totalpris att godkänna','version',quote->'version','actor','workshop');
 elsif p_action='status' then
  next_status:=p_data->>'status';
  if next_status='cancelled' and r.status not in('collected','cancelled') then null;
  elsif (r.status='approved' and next_status='in_progress') or (r.status='in_progress' and next_status='ready') or (r.status='ready' and next_status='collected') then
   quote:=r.quotes->-1;
   if quote->>'decision' is distinct from 'approved' then raise exception 'Kunden behöver godkänna senaste totalpriset'; end if;
  else raise exception 'Statusändringen är inte tillåten'; end if;
  r.status:=next_status;
  event:=jsonb_build_object('kind','status','label',case next_status when 'in_progress' then 'Arbete pågår' when 'ready' then 'Klar för hämtning' when 'collected' then 'Utlämnad' else 'Avbruten' end,'actor','workshop');
 elsif p_action='note' then
  if r.status in('collected','cancelled') then raise exception 'Avslutad arbetsorder är skrivskyddad'; end if;
  if coalesce(length(trim(p_data->>'note')),0) not between 1 and 3000 then raise exception 'Skriv vad som utförts'; end if;
  event:=jsonb_build_object('kind','service','label','Serviceanteckning','note',trim(p_data->>'note'),'actor','workshop');
 else raise exception 'Okänd åtgärd'; end if;
 r.history:=r.history||jsonb_build_array(event||jsonb_build_object('at',now()));
 update public.v2_service_orders set status=r.status,quotes=r.quotes,history=r.history,token_hash=r.token_hash,token_expires_at=r.token_expires_at,revision=revision+1,updated_at=now() where id=p_id returning * into r;
 return to_jsonb(r)-'token_hash';
end $$;
revoke all on function public.v2_service_order_owner(text,uuid,integer,jsonb) from public,anon;
grant execute on function public.v2_service_order_owner(text,uuid,integer,jsonb) to authenticated;

create or replace function public.v2_service_order_customer(p_token uuid,p_action text default 'read',p_version integer default null,p_decision text default null,p_name text default null,p_confirmed boolean default false) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.v2_service_orders;w public.workshops;quote jsonb;payload jsonb;
begin
 select * into r from public.v2_service_orders where token_hash=encode(sha256(convert_to(p_token::text,'UTF8')),'hex') and token_expires_at>now() for update;
 if not found then raise exception 'Länken har gått ut eller återkallats. Kontakta verkstaden.'; end if;
 select * into w from public.workshops where id=r.workshop_id and approved;
 if not found then raise exception 'Verkstaden är inte tillgänglig'; end if;
 if p_action='decide' then
  if auth.uid()=w.user_id then raise exception 'Kunden ska själv svara via kundlänken'; end if;
  if p_confirmed is distinct from true or coalesce(length(trim(p_name)),0) not between 1 and 200 or p_decision is null or p_decision not in('approved','declined') then raise exception 'Ange namn och bekräfta att du granskat priset'; end if;
  quote:=r.quotes->-1;
  if (quote->>'version')::integer is distinct from p_version then raise exception 'Prisförslaget har ändrats. Läs det senaste innan du svarar.'; end if;
  if quote->>'decision' is not null then
   if quote->>'decision'<>p_decision or quote->>'decision_name'<>trim(p_name) then raise exception 'Prisförslaget är redan besvarat'; end if;
  else
   if r.status<>'awaiting_approval' then raise exception 'Arbetsordern väntar inte på ett godkännande'; end if;
   if jsonb_array_length(r.history)>=500 then raise exception 'Kontakta verkstaden för fortsatt hantering'; end if;
   quote:=quote||jsonb_build_object('decision',p_decision,'decision_name',trim(p_name),'decided_at',now(),'decision_method','customer_link');
   r.quotes:=jsonb_set(r.quotes,array[(jsonb_array_length(r.quotes)-1)::text],quote);
   r.history:=r.history||jsonb_build_array(jsonb_build_object('kind','decision','label',case p_decision when 'approved' then 'Kunden godkände totalpriset' else 'Kunden avböjde totalpriset' end,'actor','customer','at',now(),'version',p_version));
   update public.v2_service_orders set quotes=r.quotes,history=r.history,status=case p_decision when 'approved' then 'approved' else 'intake' end,revision=revision+1,updated_at=now() where id=r.id returning * into r;
  end if;
 elsif p_action<>'read' then raise exception 'Okänd åtgärd'; end if;
 -- The link reveals only this order; no contact fields or other customer visits.
 return jsonb_build_object('id',r.id,'bike',r.bike,'description',r.description,'status',r.status,'quotes',r.quotes,'history',r.history,'revision',r.revision,'created_at',r.created_at,'workshop',jsonb_build_object('name',w.company_name,'phone',w.phone,'email',w.email));
end $$;
revoke all on function public.v2_service_order_customer(uuid,text,integer,text,text,boolean) from public;
grant execute on function public.v2_service_order_customer(uuid,text,integer,text,text,boolean) to anon,authenticated;
