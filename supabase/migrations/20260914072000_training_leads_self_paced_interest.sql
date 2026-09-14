-- Allow self-paced Core interest on Training leads (primary offer pivot).
ALTER TABLE public.training_leads
  DROP CONSTRAINT training_leads_interest_check;

ALTER TABLE public.training_leads
  ADD CONSTRAINT training_leads_interest_check
  CHECK (interest IS NULL OR interest IN ('public', 'private', 'both', 'self_paced'));
