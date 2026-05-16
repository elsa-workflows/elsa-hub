
ALTER TABLE public.copilot_documents
  ADD COLUMN IF NOT EXISTS chunk_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS repo text,
  ADD COLUMN IF NOT EXISTS path text,
  ADD COLUMN IF NOT EXISTS commit_sha text;

DROP INDEX IF EXISTS public.copilot_documents_source_external_idx;
CREATE UNIQUE INDEX copilot_documents_source_external_chunk_idx
  ON public.copilot_documents (source, external_id, chunk_index)
  WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS copilot_documents_source_updated_idx
  ON public.copilot_documents (source, updated_at DESC);

-- Per-source summary for the admin panel
CREATE OR REPLACE FUNCTION public.copilot_documents_summary()
RETURNS TABLE(source text, doc_count bigint, chunk_count bigint, last_updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    d.source,
    COUNT(DISTINCT d.external_id)::bigint AS doc_count,
    COUNT(*)::bigint AS chunk_count,
    MAX(d.updated_at) AS last_updated_at
  FROM public.copilot_documents d
  GROUP BY d.source
  ORDER BY d.source;
$$;

REVOKE ALL ON FUNCTION public.copilot_documents_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.copilot_documents_summary() TO authenticated, service_role;
