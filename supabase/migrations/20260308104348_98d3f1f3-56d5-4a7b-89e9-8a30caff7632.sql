
-- Fix overly permissive notifications INSERT policy
-- Notifications should only be inserted for authenticated users
DROP POLICY "System inserts notifications" ON public.notifications;
CREATE POLICY "Authenticated inserts notifications" ON public.notifications 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
