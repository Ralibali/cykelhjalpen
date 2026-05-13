-- Allow cascade delete: when a project is deleted, its offers are also deleted
ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_project_id_fkey;
ALTER TABLE public.offers ADD CONSTRAINT offers_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- Also cascade messages and unlocked_leads
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_project_id_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.unlocked_leads DROP CONSTRAINT IF EXISTS unlocked_leads_project_id_fkey;
ALTER TABLE public.unlocked_leads ADD CONSTRAINT unlocked_leads_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;