
-- Security definer function to check admin role without recursive RLS
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'admin'
  )
$$;

-- Allow admin to read ALL profiles (drop and recreate)
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);

-- Allow admin to update ANY profile
DROP POLICY IF EXISTS "Admin updates any profile" ON public.profiles;
CREATE POLICY "Admin updates any profile" ON public.profiles FOR UPDATE USING (public.is_admin(auth.uid()));

-- Allow admin to read all projects (including non-active)
DROP POLICY IF EXISTS "Active projects readable" ON public.projects;
CREATE POLICY "Active projects readable" ON public.projects FOR SELECT USING (
  status = 'active' OR buyer_id = auth.uid() OR public.is_admin(auth.uid())
);

-- Allow admin to update any project
DROP POLICY IF EXISTS "Admin updates any project" ON public.projects;
CREATE POLICY "Admin updates any project" ON public.projects FOR UPDATE USING (public.is_admin(auth.uid()));

-- Allow admin to read all offers
DROP POLICY IF EXISTS "Parties see offer" ON public.offers;
CREATE POLICY "Parties see offer" ON public.offers FOR SELECT USING (
  auth.uid() = supplier_id
  OR auth.uid() = (SELECT buyer_id FROM public.projects WHERE id = offers.project_id)
  OR public.is_admin(auth.uid())
);

-- Allow admin to read all supplier_profiles (already public)
-- Allow admin to update any supplier_profile
DROP POLICY IF EXISTS "Admin updates any supplier" ON public.supplier_profiles;
CREATE POLICY "Admin updates any supplier" ON public.supplier_profiles FOR UPDATE USING (public.is_admin(auth.uid()));

-- Allow admin to read all notifications
DROP POLICY IF EXISTS "User sees own notifications" ON public.notifications;
CREATE POLICY "User sees own notifications" ON public.notifications FOR SELECT USING (
  auth.uid() = user_id OR public.is_admin(auth.uid())
);

-- Allow admin to read all messages
DROP POLICY IF EXISTS "Parties see messages" ON public.messages;
CREATE POLICY "Parties see messages" ON public.messages FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id OR public.is_admin(auth.uid())
);

-- Allow admin to read all unlocked_leads
DROP POLICY IF EXISTS "Supplier sees own leads" ON public.unlocked_leads;
CREATE POLICY "Supplier sees own leads" ON public.unlocked_leads FOR SELECT USING (
  auth.uid() = supplier_id OR public.is_admin(auth.uid())
);

-- Allow admin to read stripe_events
DROP POLICY IF EXISTS "Admins read stripe events" ON public.stripe_events;
CREATE POLICY "Admins read stripe events" ON public.stripe_events FOR SELECT USING (public.is_admin(auth.uid()));

-- Allow admin to read all referrals
DROP POLICY IF EXISTS "Supplier sees own referrals" ON public.referrals;
CREATE POLICY "Supplier sees own referrals" ON public.referrals FOR SELECT USING (
  auth.uid() = referrer_id OR public.is_admin(auth.uid())
);
