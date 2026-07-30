-- Uppföljningsmejl till prospekt som klickat på registreringslänken.
-- kind skiljer uppföljningar från första kallkontakt så att en kortare
-- cooldown kan gälla (3 dagar för uppföljning mot 30 dagar mellan kallkontakter).

ALTER TABLE public.outreach_activities
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'initial';

COMMENT ON COLUMN public.outreach_activities.kind IS
  'initial = första kontakten, followup = uppföljning till prospekt som klickat på länken';
