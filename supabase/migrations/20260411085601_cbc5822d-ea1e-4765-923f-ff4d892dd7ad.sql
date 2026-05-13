
-- Create a combined public view for agency directory pages
CREATE OR REPLACE VIEW public.public_agency_directory AS
SELECT
  sp.id,
  sp.slug,
  sp.bio,
  sp.categories,
  sp.services,
  sp.logo_url,
  sp.cover_url,
  sp.website_url,
  sp.portfolio_urls,
  sp.avg_rating,
  sp.review_count,
  sp.completed_projects,
  sp.is_verified,
  sp.is_featured,
  sp.has_fskatt,
  sp.credit_check_passed,
  sp.contact_name,
  sp.contact_email,
  sp.org_number,
  p.full_name,
  p.company_name,
  p.city,
  p.avatar_url
FROM public.supplier_profiles sp
JOIN public.profiles p ON p.id = sp.id;

-- Set security invoker so RLS of the querying user applies
ALTER VIEW public.public_agency_directory SET (security_invoker = on);

-- Grant access to anon and authenticated
GRANT SELECT ON public.public_agency_directory TO anon;
GRANT SELECT ON public.public_agency_directory TO authenticated;
