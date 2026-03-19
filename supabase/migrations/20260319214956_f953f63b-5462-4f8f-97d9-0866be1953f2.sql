CREATE OR REPLACE FUNCTION public.rpc_captacao_kpis(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_tipo_cliente text[] DEFAULT NULL
) RETURNS TABLE(captacao_mtd numeric, captacao_ytd numeric)
LANGUAGE sql STABLE AS $$
  WITH base AS (
    SELECT anomes, captacao
    FROM captacao_consolidado_filtrado
    WHERE (p_banker IS NULL OR banker = ANY(p_banker))
      AND (p_documento IS NULL OR documento = ANY(p_documento))
      AND (p_advisor IS NULL OR advisor = ANY(p_advisor))
      AND (p_finder IS NULL OR finder = ANY(p_finder))
      AND (p_tipo_cliente IS NULL OR tipo_cliente = ANY(p_tipo_cliente))
  ),
  ref AS (
    SELECT COALESCE(
      (SELECT MAX(x) FROM unnest(p_anomes) x),
      (SELECT MAX(anomes) FROM base)
    ) AS ref_mes
  ),
  yr AS (
    SELECT (ref_mes / 100 * 100) AS year_start FROM ref
  )
  SELECT
    SUM(captacao) FILTER (WHERE anomes = (SELECT ref_mes FROM ref)) AS captacao_mtd,
    SUM(captacao) FILTER (
      WHERE anomes >= (SELECT year_start + 1 FROM yr)
        AND anomes <= (SELECT ref_mes FROM ref)
    ) AS captacao_ytd
  FROM base;
$$;