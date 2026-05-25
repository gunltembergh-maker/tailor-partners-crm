CREATE TABLE IF NOT EXISTS public._backup_positivador_total_desagrupado_25_05 AS
  SELECT * FROM public.raw_positivador_total_desagrupado;
CREATE TABLE IF NOT EXISTS public._backup_positivador_total_agrupado_25_05 AS
  SELECT * FROM public.raw_positivador_total_agrupado;
CREATE TABLE IF NOT EXISTS public._backup_comissoes_historico_pre_dedup_25_05 AS
  SELECT * FROM public.raw_comissoes_historico;
CREATE TABLE IF NOT EXISTS public._backup_envios_nps_25_05 AS
  SELECT * FROM public.raw_envios_nps;
CREATE TABLE IF NOT EXISTS public._backup_raw_comissoes_m0_25_05 AS
  SELECT * FROM public.raw_comissoes_m0;
CREATE TABLE IF NOT EXISTS public._backup_raw_captacao_total_25_05 AS
  SELECT * FROM public.raw_captacao_total;
CREATE TABLE IF NOT EXISTS public._backup_raw_captacao_historico_25_05 AS
  SELECT * FROM public.raw_captacao_historico;
CREATE TABLE IF NOT EXISTS public._backup_raw_contas_total_25_05 AS
  SELECT * FROM public.raw_contas_total;