
ALTER TABLE public.supplier_profiles ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE public.supplier_profiles ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE public.supplier_profiles ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE public.supplier_profiles ADD COLUMN IF NOT EXISTS contact_avatar_url text;
ALTER TABLE public.supplier_profiles ADD COLUMN IF NOT EXISTS org_number text;
ALTER TABLE public.supplier_profiles ADD COLUMN IF NOT EXISTS has_fskatt boolean DEFAULT false;
ALTER TABLE public.supplier_profiles ADD COLUMN IF NOT EXISTS has_fskatt_verified_at timestamptz;
ALTER TABLE public.supplier_profiles ADD COLUMN IF NOT EXISTS credit_check_passed boolean DEFAULT false;
ALTER TABLE public.supplier_profiles ADD COLUMN IF NOT EXISTS credit_check_at timestamptz;
