-- Add DELETE policy for organization owners
-- Only owners can delete their organization
CREATE POLICY "Org owners can delete their organization"
  ON public.organizations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organizations.id
        AND om.user_id = auth.uid()
        AND om.role = 'owner'
    )
  );