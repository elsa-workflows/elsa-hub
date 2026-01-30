-- Create notification type enum
CREATE TYPE notification_type AS ENUM (
  'org_invitation',
  'provider_invitation',
  'work_logged',
  'purchase_completed',
  'subscription_renewed',
  'intro_call_submitted'
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  action_url TEXT,
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_notifications_user_unread 
  ON notifications(user_id, created_at DESC) 
  WHERE read_at IS NULL;

CREATE INDEX idx_notifications_user_type 
  ON notifications(user_id, type);

-- RLS: Users can only see their own notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add new preference columns
ALTER TABLE notification_preferences
  ADD COLUMN notify_org_invitation BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN notify_intro_call BOOLEAN NOT NULL DEFAULT true;