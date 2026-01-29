-- Fix: Remove overly permissive policy and let the SECURITY DEFINER trigger handle inserts
DROP POLICY IF EXISTS "Service role can insert preferences" ON public.notification_preferences;