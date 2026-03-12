
-- Add mes_ano column to raw_comissoes_historico and raw_comissoes_m0 for month-based partitioning
ALTER TABLE public.raw_comissoes_historico ADD COLUMN IF NOT EXISTS mes_ano text;
ALTER TABLE public.raw_comissoes_m0 ADD COLUMN IF NOT EXISTS mes_ano text;

-- Add mes_ano_list column to sync_logs for tracking processed periods
ALTER TABLE public.sync_logs ADD COLUMN IF NOT EXISTS mes_ano_list text[];
