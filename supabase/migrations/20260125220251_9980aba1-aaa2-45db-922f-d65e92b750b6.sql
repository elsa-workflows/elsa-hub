-- Drop the profiles table (this also removes all RLS policies on it)
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop the trigger function for handling new users
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop the updated_at trigger function if not used elsewhere
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;