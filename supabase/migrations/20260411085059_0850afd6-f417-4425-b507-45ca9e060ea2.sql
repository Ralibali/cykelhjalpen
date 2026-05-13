
-- Allow anon to read profiles (needed for public agency directory pages)
CREATE POLICY "Anon reads profiles for directory"
ON public.profiles
FOR SELECT
TO anon
USING (true);
