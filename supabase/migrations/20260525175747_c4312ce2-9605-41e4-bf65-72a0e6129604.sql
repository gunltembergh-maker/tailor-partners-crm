WITH ranked AS (
  SELECT ctid, ROW_NUMBER() OVER (PARTITION BY MD5(data::text) ORDER BY ctid) AS rn
  FROM public.raw_positivador_total_desagrupado
)
DELETE FROM public.raw_positivador_total_desagrupado
WHERE ctid IN (SELECT ctid FROM ranked WHERE rn > 1);

WITH ranked AS (
  SELECT ctid, ROW_NUMBER() OVER (PARTITION BY MD5(data::text) ORDER BY ctid) AS rn
  FROM public.raw_positivador_total_agrupado
)
DELETE FROM public.raw_positivador_total_agrupado
WHERE ctid IN (SELECT ctid FROM ranked WHERE rn > 1);

ALTER TABLE public.raw_comissoes_historico DISABLE TRIGGER trg_refresh_mv_after_hist;
WITH ranked AS (
  SELECT ctid, ROW_NUMBER() OVER (PARTITION BY MD5(data::text) ORDER BY ctid) AS rn
  FROM public.raw_comissoes_historico
)
DELETE FROM public.raw_comissoes_historico
WHERE ctid IN (SELECT ctid FROM ranked WHERE rn > 1);
ALTER TABLE public.raw_comissoes_historico ENABLE TRIGGER trg_refresh_mv_after_hist;

WITH ranked AS (
  SELECT ctid, ROW_NUMBER() OVER (PARTITION BY MD5(data::text) ORDER BY ctid) AS rn
  FROM public.raw_envios_nps
)
DELETE FROM public.raw_envios_nps
WHERE ctid IN (SELECT ctid FROM ranked WHERE rn > 1);

WITH ranked AS (
  SELECT ctid, ROW_NUMBER() OVER (PARTITION BY MD5(data::text) ORDER BY ctid) AS rn
  FROM public.raw_comissoes_m0
)
DELETE FROM public.raw_comissoes_m0 WHERE ctid IN (SELECT ctid FROM ranked WHERE rn > 1);

WITH ranked AS (
  SELECT ctid, ROW_NUMBER() OVER (PARTITION BY MD5(data::text) ORDER BY ctid) AS rn
  FROM public.raw_captacao_total
)
DELETE FROM public.raw_captacao_total WHERE ctid IN (SELECT ctid FROM ranked WHERE rn > 1);

WITH ranked AS (
  SELECT ctid, ROW_NUMBER() OVER (PARTITION BY MD5(data::text) ORDER BY ctid) AS rn
  FROM public.raw_captacao_historico
)
DELETE FROM public.raw_captacao_historico WHERE ctid IN (SELECT ctid FROM ranked WHERE rn > 1);

WITH ranked AS (
  SELECT ctid, ROW_NUMBER() OVER (PARTITION BY MD5(data::text) ORDER BY ctid) AS rn
  FROM public.raw_contas_total
)
DELETE FROM public.raw_contas_total WHERE ctid IN (SELECT ctid FROM ranked WHERE rn > 1);