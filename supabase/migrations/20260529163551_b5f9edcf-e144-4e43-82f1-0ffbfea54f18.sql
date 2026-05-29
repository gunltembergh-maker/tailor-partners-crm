UPDATE public.sync_cursor
SET status = 'pending', attempts = 0, error = NULL,
    claimed_by = NULL, claimed_until = NULL,
    updated_at = NOW()
WHERE sync_name = 'historico_completo';