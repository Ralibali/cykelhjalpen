
-- Fix SECURITY DEFINER views by recreating as SECURITY INVOKER
ALTER VIEW public.public_profiles SET (security_invoker = on);
ALTER VIEW public.public_supplier_profiles SET (security_invoker = on);
