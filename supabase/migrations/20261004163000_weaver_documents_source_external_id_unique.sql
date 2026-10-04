-- weaver-ingest upserts with onConflict 'source,external_id'. PostgREST can
-- only target a non-partial UNIQUE on those exact columns. The existing
-- copilot_documents_source_external_chunk_idx is UNIQUE (source, external_id,
-- chunk_index) WHERE external_id IS NOT NULL, which cannot be used.
-- The ingest encodes chunk identity into external_id (blog:...#idx), so
-- (source, external_id) is the intended row key. Keep the old partial index.

CREATE UNIQUE INDEX IF NOT EXISTS weaver_documents_source_external_id_uidx
  ON public.weaver_documents (source, external_id);
