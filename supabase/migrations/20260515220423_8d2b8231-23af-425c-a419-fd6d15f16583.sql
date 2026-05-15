
-- Enable pgvector
create extension if not exists vector with schema extensions;

-- copilot_threads
create table public.copilot_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  route_context jsonb not null default '{}'::jsonb,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index copilot_threads_user_id_idx on public.copilot_threads(user_id, last_message_at desc);
alter table public.copilot_threads enable row level security;

create policy "Users view own copilot threads"
  on public.copilot_threads for select to authenticated
  using (user_id = auth.uid());
create policy "Users insert own copilot threads"
  on public.copilot_threads for insert to authenticated
  with check (user_id = auth.uid());
create policy "Users update own copilot threads"
  on public.copilot_threads for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users delete own copilot threads"
  on public.copilot_threads for delete to authenticated
  using (user_id = auth.uid());

-- copilot_messages
create table public.copilot_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.copilot_threads(id) on delete cascade,
  role text not null check (role in ('user','assistant','system','tool')),
  parts jsonb not null default '[]'::jsonb,
  ai_sdk_id text,
  created_at timestamptz not null default now()
);
create index copilot_messages_thread_idx on public.copilot_messages(thread_id, created_at);
alter table public.copilot_messages enable row level security;

create policy "Users view messages in own threads"
  on public.copilot_messages for select to authenticated
  using (exists (select 1 from public.copilot_threads t where t.id = thread_id and t.user_id = auth.uid()));
create policy "Users insert user messages in own threads"
  on public.copilot_messages for insert to authenticated
  with check (
    role = 'user'
    and exists (select 1 from public.copilot_threads t where t.id = thread_id and t.user_id = auth.uid())
  );

-- updated_at trigger for threads
create trigger trg_copilot_threads_updated_at
  before update on public.copilot_threads
  for each row execute function public.update_updated_at_column();

-- copilot_documents (RAG)
create table public.copilot_documents (
  id uuid primary key default gen_random_uuid(),
  source text not null,            -- e.g. 'page', 'package', 'bundle', 'faq'
  external_id text,                -- optional dedupe key per source
  url text,
  title text not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding extensions.vector(768),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index copilot_documents_source_external_idx
  on public.copilot_documents(source, external_id)
  where external_id is not null;
create index copilot_documents_embedding_idx
  on public.copilot_documents using hnsw (embedding extensions.vector_cosine_ops);
alter table public.copilot_documents enable row level security;

create policy "Anyone can read copilot documents"
  on public.copilot_documents for select to anon, authenticated using (true);
-- writes restricted to service role (no policy for anon/authenticated insert/update/delete)

-- Similarity search RPC
create or replace function public.match_copilot_documents(
  query_embedding extensions.vector(768),
  match_count int default 6,
  source_filter text default null
)
returns table (
  id uuid,
  source text,
  url text,
  title text,
  body text,
  metadata jsonb,
  similarity float
)
language sql stable security definer set search_path = public, extensions
as $$
  select d.id, d.source, d.url, d.title, d.body, d.metadata,
         1 - (d.embedding <=> query_embedding) as similarity
  from public.copilot_documents d
  where d.embedding is not null
    and (source_filter is null or d.source = source_filter)
  order by d.embedding <=> query_embedding
  limit greatest(1, least(match_count, 20));
$$;

revoke all on function public.match_copilot_documents(extensions.vector, int, text) from public;
grant execute on function public.match_copilot_documents(extensions.vector, int, text) to anon, authenticated, service_role;
