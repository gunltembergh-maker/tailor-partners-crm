-- Reset cursor
UPDATE public.sync_cursor
   SET status = 'pending',
       started_at = NOW(),
       updated_at = NOW(),
       total_rows_seen = 0,
       total_rows_target = NULL,
       attempts = 0,
       error = NULL,
       claimed_by = NULL,
       claimed_until = NULL,
       completed_at = NULL
 WHERE sync_name = 'historico_completo';

-- Disparar init (mesma chamada do cron 38)
SELECT net.http_post(
  url := 'https://jtlelokzpqkgvlwomfus.supabase.co/functions/v1/sync-sharepoint',
  headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bGVsb2t6cHFrZ3Zsd29tZnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDc1NTksImV4cCI6MjA4NjQ4MzU1OX0.I1aVvbbMp_R3-R0CN4G4rcWWqG3vf2FrqXFnMlKZ43U"}'::jsonb,
  body := '{"tipo":"automatico","arquivo":"base_receita","sync_mode":"historico_chunked_init"}'::jsonb
);