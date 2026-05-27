-- 1. workspace_files: file metadata for the shared workspace
CREATE TABLE public.workspace_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.engagement_workspaces(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  description TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workspace_files_workspace ON public.workspace_files(workspace_id, created_at DESC);
CREATE INDEX idx_workspace_files_uploader ON public.workspace_files(uploaded_by);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_files TO authenticated;
GRANT ALL ON public.workspace_files TO service_role;

ALTER TABLE public.workspace_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Engagement members can view files"
  ON public.workspace_files FOR SELECT TO authenticated
  USING (is_engagement_member(workspace_id));

CREATE POLICY "Engagement members can upload files"
  ON public.workspace_files FOR INSERT TO authenticated
  WITH CHECK (is_engagement_member(workspace_id) AND uploaded_by = auth.uid());

CREATE POLICY "Engagement members can update file metadata"
  ON public.workspace_files FOR UPDATE TO authenticated
  USING (is_engagement_member(workspace_id))
  WITH CHECK (is_engagement_member(workspace_id));

CREATE POLICY "Engagement members can delete files"
  ON public.workspace_files FOR DELETE TO authenticated
  USING (is_engagement_member(workspace_id));

CREATE TRIGGER update_workspace_files_updated_at
  BEFORE UPDATE ON public.workspace_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. work_log_attachments: link files to work logs
CREATE TABLE public.work_log_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_log_id UUID NOT NULL,
  file_id UUID NOT NULL REFERENCES public.workspace_files(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  UNIQUE (work_log_id, file_id)
);

CREATE INDEX idx_work_log_attachments_log ON public.work_log_attachments(work_log_id);
CREATE INDEX idx_work_log_attachments_file ON public.work_log_attachments(file_id);

GRANT SELECT, INSERT, DELETE ON public.work_log_attachments TO authenticated;
GRANT ALL ON public.work_log_attachments TO service_role;

ALTER TABLE public.work_log_attachments ENABLE ROW LEVEL SECURITY;

-- Visible to anyone who can see the linked work log (org members or provider members of the log)
CREATE POLICY "Engagement members can view attachments"
  ON public.work_log_attachments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_logs wl
      WHERE wl.id = work_log_attachments.work_log_id
        AND (is_org_member(wl.organization_id) OR is_provider_member(wl.service_provider_id))
    )
  );

-- Only members of the matching engagement workspace (which corresponds to the work log's org+provider)
CREATE POLICY "Engagement members can attach files"
  ON public.work_log_attachments FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM work_logs wl
      JOIN workspace_files wf ON wf.id = work_log_attachments.file_id
      JOIN engagement_workspaces ew ON ew.id = wf.workspace_id
      WHERE wl.id = work_log_attachments.work_log_id
        AND ew.organization_id = wl.organization_id
        AND ew.service_provider_id = wl.service_provider_id
        AND is_engagement_member(ew.id)
    )
  );

CREATE POLICY "Engagement members can detach files"
  ON public.work_log_attachments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_files wf
      WHERE wf.id = work_log_attachments.file_id
        AND is_engagement_member(wf.workspace_id)
    )
  );

-- 3. Storage bucket: private, 50 MB per file, mime allowlist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'engagement-files',
  'engagement-files',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
    'text/csv',
    'text/vtt',
    'application/x-subrip',
    'application/json',
    'application/zip',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/webm',
    'audio/x-m4a',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: scope by workspace_id in the first path segment
CREATE POLICY "Engagement members can read workspace files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'engagement-files'
    AND is_engagement_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Engagement members can upload workspace files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'engagement-files'
    AND is_engagement_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Engagement members can update workspace files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'engagement-files'
    AND is_engagement_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Engagement members can delete workspace files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'engagement-files'
    AND is_engagement_member(((storage.foldername(name))[1])::uuid)
  );