
-- 1. Add max_offers and slots_left to projects for urgency indicator
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS max_offers integer DEFAULT 5;

-- 2. Add verification fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_bankid_verified boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_phone_verified boolean DEFAULT false;

-- 3. Create referrals table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_email text NOT NULL,
  referred_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  credits_awarded boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supplier sees own referrals" ON public.referrals
  FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id);

CREATE POLICY "Supplier creates referral" ON public.referrals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = referrer_id);
