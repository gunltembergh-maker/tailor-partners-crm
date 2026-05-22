
UPDATE public.sync_cursor
SET status = 'pending',
    started_at = NOW(),
    updated_at = NOW(),
    total_rows_seen = 0,
    total_rows_target = NULL,
    attempts = 0,
    error = NULL
WHERE sync_name = 'historico_completo';
