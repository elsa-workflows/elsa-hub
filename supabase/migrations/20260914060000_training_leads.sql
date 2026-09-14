-- Training page lead capture (notify / private quote / provider listing).
-- Mirrors runtime_enquiries: public insert, platform-admin read/update.

CREATE TABLE public.training_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intent text NOT NULL,
  email text NOT NULL,
  contact_name text,
  role text,
  company text,
  company_size text,
  interest text,
  preferred_length text,
  start_month text,
  headcount integer,
  delivery text,
  timezone_region text,
  notes text,
  organization_name text,
  website text,
  regions text[],
  languages text[],
  offerings text[],
  experience text,
  outline_url text,
  source_page text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new',
  internal_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT training_leads_intent_check CHECK (intent IN ('notify', 'quote', 'provider')),
  CONSTRAINT training_leads_status_check CHECK (status IN ('new', 'contacted', 'closed')),
  CONSTRAINT training_leads_interest_check CHECK (interest IS NULL OR interest IN ('public', 'private', 'both')),
  CONSTRAINT training_leads_length_check CHECK (preferred_length IS NULL OR preferred_length IN ('half_day', 'one_day', 'either')),
  CONSTRAINT training_leads_delivery_check CHECK (delivery IS NULL OR delivery IN ('remote', 'on_site', 'either')),
  CONSTRAINT training_leads_email_check CHECK (char_length(email) BETWEEN 3 AND 320),
  CONSTRAINT training_leads_headcount_check CHECK (headcount IS NULL OR (headcount BETWEEN 1 AND 500)),
  CONSTRAINT training_leads_notes_check CHECK (notes IS NULL OR char_length(notes) BETWEEN 1 AND 5000),
  CONSTRAINT training_leads_experience_check CHECK (experience IS NULL OR char_length(experience) BETWEEN 1 AND 5000)
);

CREATE INDEX idx_training_leads_intent_status_created
  ON public.training_leads (intent, status, created_at DESC);

GRANT INSERT ON public.training_leads TO anon;
GRANT INSERT, SELECT, UPDATE ON public.training_leads TO authenticated;
GRANT ALL ON public.training_leads TO service_role;

ALTER TABLE public.training_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a training lead"
ON public.training_leads FOR INSERT
TO anon, authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Platform admins can view training leads"
ON public.training_leads FOR SELECT
TO authenticated
USING (public.is_platform_admin());

CREATE POLICY "Platform admins can update training leads"
ON public.training_leads FOR UPDATE
TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

CREATE TRIGGER trg_training_leads_updated_at
BEFORE UPDATE ON public.training_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.training_leads IS
  'Elsa+ Training interest: notify-me, private-quote, and provider-listing leads. Triage in Dashboard → Admin → Training leads. Quote first, then providers, then notify-me list demand.';
