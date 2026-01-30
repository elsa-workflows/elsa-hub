-- Create unsubscribe_tokens table for secure one-click unsubscribe
CREATE TABLE public.unsubscribe_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  used_at timestamp with time zone
);

-- Create index for fast token lookups
CREATE INDEX idx_unsubscribe_tokens_hash ON public.unsubscribe_tokens(token_hash);
CREATE INDEX idx_unsubscribe_tokens_user ON public.unsubscribe_tokens(user_id);

-- Enable RLS
ALTER TABLE public.unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

-- No direct user access - only service role can manage tokens
-- This is intentional: tokens are created/validated in edge functions with service role

-- Add newsletter_enabled column to notification_preferences
ALTER TABLE public.notification_preferences 
ADD COLUMN newsletter_enabled boolean NOT NULL DEFAULT false;

-- Comment for clarity
COMMENT ON TABLE public.unsubscribe_tokens IS 'Stores hashed tokens for one-click email unsubscribe without requiring login';
COMMENT ON COLUMN public.unsubscribe_tokens.token_hash IS 'SHA-256 hash of the actual token sent in emails';
COMMENT ON COLUMN public.unsubscribe_tokens.used_at IS 'Timestamp when token was used, null if unused';