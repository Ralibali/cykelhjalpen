-- Allow deleting a project even after an accepted offer/review flow by cascading related reviews
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_project_id_fkey;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;