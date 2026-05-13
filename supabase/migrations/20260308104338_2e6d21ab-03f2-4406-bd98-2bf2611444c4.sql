
-- Timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1. Profiles
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('buyer', 'supplier', 'admin')),
  full_name text,
  email text,
  company_name text,
  city text,
  phone text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users delete own profile" ON public.profiles FOR DELETE USING (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Supplier profiles
CREATE TABLE public.supplier_profiles (
  id uuid REFERENCES public.profiles ON DELETE CASCADE PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  bio text,
  logo_url text,
  cover_url text,
  categories text[] DEFAULT '{}',
  services text[] DEFAULT '{}',
  portfolio_urls text[] DEFAULT '{}',
  website_url text,
  avg_rating numeric(3,2) DEFAULT 0,
  review_count int DEFAULT 0,
  completed_projects int DEFAULT 0,
  plan text CHECK (plan IN ('none','trial','payg','standard','premium')) DEFAULT 'none',
  trial_ends_at timestamptz,
  trial_leads_used int DEFAULT 0,
  lead_credits int DEFAULT 0,
  stripe_customer_id text,
  stripe_subscription_id text,
  is_featured boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.supplier_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read supplier_profiles" ON public.supplier_profiles FOR SELECT USING (true);
CREATE POLICY "Supplier manages own" ON public.supplier_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Supplier inserts own" ON public.supplier_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. Projects
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  budget_range text CHECK (budget_range IN ('under_10k','10k_50k','50k_150k','over_150k','unknown')),
  start_time text CHECK (start_time IN ('asap','within_month','within_3months','flexible')),
  city text,
  is_company boolean DEFAULT true,
  status text CHECK (status IN ('draft','active','closed','completed')) DEFAULT 'active',
  offer_count int DEFAULT 0,
  view_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active projects readable" ON public.projects FOR SELECT USING (status = 'active' OR buyer_id = auth.uid());
CREATE POLICY "Buyer inserts own project" ON public.projects FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Buyer updates own project" ON public.projects FOR UPDATE USING (auth.uid() = buyer_id);
CREATE POLICY "Buyer deletes own project" ON public.projects FOR DELETE USING (auth.uid() = buyer_id);

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Offers
CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects ON DELETE CASCADE NOT NULL,
  supplier_id uuid REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  price numeric(12,2) NOT NULL,
  payment_plan text CHECK (payment_plan IN ('fixed','hourly','milestone')),
  delivery_weeks int,
  status text CHECK (status IN ('pending','accepted','declined','withdrawn')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, supplier_id)
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties see offer" ON public.offers FOR SELECT USING (
  auth.uid() = supplier_id OR
  auth.uid() = (SELECT buyer_id FROM public.projects WHERE id = project_id)
);
CREATE POLICY "Supplier creates offer" ON public.offers FOR INSERT WITH CHECK (auth.uid() = supplier_id);
CREATE POLICY "Supplier updates own offer" ON public.offers FOR UPDATE USING (auth.uid() = supplier_id);
CREATE POLICY "Buyer updates offer status" ON public.offers FOR UPDATE USING (
  auth.uid() = (SELECT buyer_id FROM public.projects WHERE id = project_id)
);

-- 5. Messages
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles NOT NULL,
  receiver_id uuid REFERENCES public.profiles NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties see messages" ON public.messages FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);
CREATE POLICY "Users send own messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Receiver marks read" ON public.messages FOR UPDATE USING (auth.uid() = receiver_id);

-- 6. Reviews
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  buyer_id uuid REFERENCES public.profiles NOT NULL,
  project_id uuid REFERENCES public.projects NOT NULL,
  rating int CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, buyer_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Buyer writes review" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- 7. Unlocked leads
CREATE TABLE public.unlocked_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES public.profiles NOT NULL,
  project_id uuid REFERENCES public.projects NOT NULL,
  used_trial_credit boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(supplier_id, project_id)
);

ALTER TABLE public.unlocked_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Supplier sees own leads" ON public.unlocked_leads FOR SELECT USING (auth.uid() = supplier_id);
CREATE POLICY "Supplier unlocks lead" ON public.unlocked_leads FOR INSERT WITH CHECK (auth.uid() = supplier_id);

-- 8. Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  link text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User sees own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User updates own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System inserts notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- 9. Stripe events
CREATE TABLE public.stripe_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  supplier_id uuid REFERENCES public.profiles,
  amount_sek numeric(12,2),
  plan text,
  credits_added int,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read stripe events" ON public.stripe_events FOR SELECT USING (false);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio', 'portfolio', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true);

-- Storage policies
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Users upload own logo" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own logo" ON storage.objects FOR UPDATE USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read portfolio" ON storage.objects FOR SELECT USING (bucket_id = 'portfolio');
CREATE POLICY "Users upload own portfolio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'portfolio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read covers" ON storage.objects FOR SELECT USING (bucket_id = 'covers');
CREATE POLICY "Users upload own cover" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own cover" ON storage.objects FOR UPDATE USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enable realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;
