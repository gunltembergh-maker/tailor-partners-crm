
ALTER TABLE public.sync_cursor DROP CONSTRAINT sync_cursor_status_check;
ALTER TABLE public.sync_cursor ADD CONSTRAINT sync_cursor_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text, 'stale'::text, 'ready_for_swap'::text]));
