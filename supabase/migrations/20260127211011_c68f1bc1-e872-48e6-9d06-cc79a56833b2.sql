-- 1. Add created_by column to track who created the organization
ALTER TABLE public.organizations 
ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- 2. Create BEFORE INSERT trigger function to set created_by
CREATE OR REPLACE FUNCTION public.set_organization_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$;

-- 3. Create the BEFORE INSERT trigger
CREATE TRIGGER on_organization_before_insert
  BEFORE INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_creator();

-- 4. Add SELECT policy for creator (allows RETURNING to work immediately)
CREATE POLICY "Creators can view their organization"
ON public.organizations FOR SELECT
TO authenticated
USING (created_by = auth.uid());