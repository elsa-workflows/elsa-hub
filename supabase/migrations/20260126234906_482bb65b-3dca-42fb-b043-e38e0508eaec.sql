-- Allow authenticated users to create organizations
-- When creating, they automatically become the owner

CREATE POLICY "Users can create organizations"
ON public.organizations FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create a trigger to automatically add the creator as owner
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_organization();