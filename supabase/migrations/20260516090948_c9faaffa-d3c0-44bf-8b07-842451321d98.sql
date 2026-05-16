ALTER TABLE public.copilot_documents RENAME TO weaver_documents;
ALTER TABLE public.copilot_messages RENAME TO weaver_messages;
ALTER TABLE public.copilot_rate_events RENAME TO weaver_rate_events;
ALTER TABLE public.copilot_threads RENAME TO weaver_threads;

-- Update the unique index for weaver_documents if it exists
-- Actually, RENAME TABLE also renames indexes usually, but let's check.
-- RLS policies are also preserved usually, but let's check.
