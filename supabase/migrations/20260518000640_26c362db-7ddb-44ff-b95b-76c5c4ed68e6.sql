CREATE OR REPLACE FUNCTION public.match_copilot_documents(
  query_embedding extensions.vector,
  match_count integer DEFAULT 6,
  source_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  source text,
  url text,
  title text,
  body text,
  metadata jsonb,
  similarity double precision
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT d.id, d.source, d.url, d.title, d.body, d.metadata,
         1 - (d.embedding <=> query_embedding) AS similarity
  FROM public.weaver_documents d
  WHERE d.embedding IS NOT NULL
    AND (source_filter IS NULL OR d.source = source_filter)
  ORDER BY d.embedding <=> query_embedding
  LIMIT greatest(1, least(match_count, 20));
$$;

CREATE OR REPLACE FUNCTION public.copilot_documents_summary()
RETURNS TABLE (
  source text,
  doc_count bigint,
  chunk_count bigint,
  last_updated_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    d.source,
    COUNT(DISTINCT d.external_id)::bigint AS doc_count,
    COUNT(*)::bigint AS chunk_count,
    MAX(d.updated_at) AS last_updated_at
  FROM public.weaver_documents d
  GROUP BY d.source
  ORDER BY d.source;
$$;