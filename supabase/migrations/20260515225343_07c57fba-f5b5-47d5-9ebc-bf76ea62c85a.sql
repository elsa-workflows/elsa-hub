-- Allow thread owners to persist assistant messages from the client
-- (used for partial saves when the user aborts a streaming run).
CREATE POLICY "Users insert assistant messages in own threads"
ON public.copilot_messages
FOR INSERT
TO authenticated
WITH CHECK (
  role = 'assistant'
  AND EXISTS (
    SELECT 1 FROM public.copilot_threads t
    WHERE t.id = copilot_messages.thread_id
      AND t.user_id = auth.uid()
  )
);