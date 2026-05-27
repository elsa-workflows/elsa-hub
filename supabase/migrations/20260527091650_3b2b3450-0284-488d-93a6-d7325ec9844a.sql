CREATE TYPE public.session_type AS ENUM ('call', 'workshop', 'async_review', 'other');

CREATE TABLE public.workspace_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.engagement_workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  session_type public.session_type NOT NULL DEFAULT 'call',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_minutes INTEGER,
  participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes_markdown TEXT NOT NULL DEFAULT '',
  ai_summary TEXT,
  ai_key_points JSONB,
  ai_action_items JSONB,
  ai_generated_at TIMESTAMPTZ,
  related_work_log_id UUID REFERENCES public.work_logs(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workspace_sessions_workspace ON public.workspace_sessions(workspace_id, occurred_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_sessions TO authenticated;
GRANT ALL ON public.workspace_sessions TO service_role;

ALTER TABLE public.workspace_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Engagement members can view sessions"
  ON public.workspace_sessions FOR SELECT TO authenticated
  USING (public.is_engagement_member(workspace_id));

CREATE POLICY "Engagement members can create sessions"
  ON public.workspace_sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_engagement_member(workspace_id) AND created_by = auth.uid());

CREATE POLICY "Engagement members can update sessions"
  ON public.workspace_sessions FOR UPDATE TO authenticated
  USING (public.is_engagement_member(workspace_id))
  WITH CHECK (public.is_engagement_member(workspace_id));

CREATE POLICY "Engagement members can delete sessions"
  ON public.workspace_sessions FOR DELETE TO authenticated
  USING (public.is_engagement_member(workspace_id));

CREATE TRIGGER update_workspace_sessions_updated_at
  BEFORE UPDATE ON public.workspace_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.workspace_files
  ADD COLUMN session_id UUID REFERENCES public.workspace_sessions(id) ON DELETE SET NULL;

CREATE INDEX idx_workspace_files_session ON public.workspace_files(session_id) WHERE session_id IS NOT NULL;