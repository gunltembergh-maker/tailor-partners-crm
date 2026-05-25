
-- Etapa 1: disable refresh trigger on staging (normalize stays enabled)
ALTER TABLE public.raw_comissoes_historico_staging
  DISABLE TRIGGER trg_refresh_mv_after_hist;

-- Etapa 2: defensive backup
CREATE TABLE IF NOT EXISTS public._backup_pre_rename_test_25_05 AS
SELECT * FROM public.raw_comissoes_historico;
