-- Tighten weaver_documents after weaver_documents_source_external_id_uidx:
-- external_id is the ingest key and is never written NULL. Refuse SET NOT NULL
-- if any NULL rows exist (live is empty / nearly empty). Drop the leftover
-- partial unique copilot_documents_source_external_chunk_idx (public schema,
-- name unchanged after the copilot_documents → weaver_documents rename).

do $$
begin
  if exists (select 1 from public.weaver_documents where external_id is null) then
    raise exception 'weaver_documents.external_id has NULL rows; refuse SET NOT NULL';
  end if;
end $$;

alter table public.weaver_documents
  alter column external_id set not null;

drop index if exists public.copilot_documents_source_external_chunk_idx;
