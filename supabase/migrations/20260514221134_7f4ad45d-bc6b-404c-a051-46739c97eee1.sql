-- ============================================================
-- PART A: Materialized View + Matheus C normalization
-- ============================================================

DROP VIEW IF EXISTS public.vw_comissoes_caixa_completa CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_comissoes_caixa_completa CASCADE;

CREATE MATERIALIZED VIEW public.mv_comissoes_caixa_completa AS
WITH base AS (
  SELECT
    to_char(((r.data ->> 'Data')::date)::timestamp with time zone, 'YYYYMM')::integer AS anomes,
    fix_encoding(r.data ->> 'Categoria') AS categoria,
    fix_encoding(r.data ->> 'Subcategoria') AS subcategoria,
    fix_encoding(r.data ->> 'Produto') AS produto,
    fix_encoding(r.data ->> 'Subproduto') AS subproduto,
    fix_encoding(btrim(r.data ->> 'Banker')) AS banker_raw,
    fix_encoding(btrim(r.data ->> 'Advisor')) AS advisor_raw,
    fix_encoding(btrim(r.data ->> 'Finder')) AS finder_raw,
    fix_encoding(btrim(r.data ->> 'Canal')) AS canal_raw,
    r.data ->> 'Tipo de Cliente' AS tipo_cliente,
    COALESCE(NULLIF(TRIM(r.data ->> 'Documento'), ''), NULLIF(TRIM(r.data ->> 'Cliente'), '')) AS documento,
    parse_num(COALESCE(r.data ->> 'Comissão Bruta Tailor', r.data ->> 'ComissÃ£o Bruta Tailor')) AS comissao_bruta_tailor,
    'm0'::text AS source_origin,
    r.id AS source_row_id
  FROM raw_comissoes_m0 r
  WHERE (r.data ->> 'Data') IS NOT NULL
    AND (r.data ->> 'Categoria') IS NOT NULL
    AND NOT (
      to_char(((r.data ->> 'Data')::date)::timestamp with time zone, 'YYYYMM')::integer
      IN (
        SELECT DISTINCT to_char(((h.data ->> 'Data')::date)::timestamp with time zone, 'YYYYMM')::integer
        FROM raw_comissoes_historico h
        WHERE (h.data ->> 'Data') IS NOT NULL
      )
    )
  UNION ALL
  SELECT
    to_char(((r.data ->> 'Data')::date)::timestamp with time zone, 'YYYYMM')::integer AS anomes,
    fix_encoding(r.data ->> 'Categoria') AS categoria,
    fix_encoding(r.data ->> 'Subcategoria') AS subcategoria,
    fix_encoding(r.data ->> 'Produto') AS produto,
    fix_encoding(r.data ->> 'Subproduto') AS subproduto,
    fix_encoding(btrim(r.data ->> 'Banker')) AS banker_raw,
    fix_encoding(btrim(r.data ->> 'Advisor')) AS advisor_raw,
    fix_encoding(btrim(r.data ->> 'Finder')) AS finder_raw,
    fix_encoding(btrim(r.data ->> 'Canal')) AS canal_raw,
    r.data ->> 'Tipo de Cliente' AS tipo_cliente,
    COALESCE(NULLIF(TRIM(r.data ->> 'Documento'), ''), NULLIF(TRIM(r.data ->> 'Cliente'), '')) AS documento,
    parse_num(COALESCE(r.data ->> 'Comissão Bruta Tailor', r.data ->> 'ComissÃ£o Bruta Tailor')) AS comissao_bruta_tailor,
    'historico'::text AS source_origin,
    r.id AS source_row_id
  FROM raw_comissoes_historico r
  WHERE (r.data ->> 'Data') IS NOT NULL
    AND (r.data ->> 'Categoria') IS NOT NULL
),
desligados_set AS (
  SELECT DISTINCT nome_normalizado FROM view_desligados
)
SELECT
  b.anomes, b.categoria, b.subcategoria, b.produto, b.subproduto,
  CASE
    WHEN b.banker_raw IS NULL OR b.banker_raw = '' THEN 'Sem Advisor'
    WHEN d_banker.nome_normalizado IS NOT NULL THEN 'Legado'
    WHEN b.banker_raw IN ('Enrico Santos', 'Nicholas Barbarisi') THEN 'Richard S'
    WHEN b.banker_raw = 'Murilo Jacob' THEN 'Gustavo Faria'
    WHEN b.banker_raw = 'Sem Assessor' THEN 'Sem Advisor'
    ELSE b.banker_raw
  END AS banker,
  CASE
    WHEN b.advisor_raw IS NULL OR b.advisor_raw = '' THEN 'Sem Advisor'
    WHEN d_advisor.nome_normalizado IS NOT NULL THEN 'Legado'
    WHEN b.advisor_raw = 'João S' THEN 'João Fontes'
    WHEN b.advisor_raw = 'Matheus C' THEN 'Matheus Castro'
    WHEN b.advisor_raw IN ('Legado', 'Legado Advisor') THEN 'Sem Advisor'
    ELSE b.advisor_raw
  END AS advisor,
  CASE
    WHEN b.finder_raw IS NULL OR b.finder_raw = '' THEN 'Sem Finder'
    WHEN d_finder.nome_normalizado IS NOT NULL THEN 'Legado'
    WHEN lower(b.finder_raw) = 'josé de marchi' THEN 'José De Marchi'
    ELSE b.finder_raw
  END AS finder,
  CASE
    WHEN b.canal_raw IS NULL OR b.canal_raw = '' THEN 'Sem Canal'
    WHEN d_canal.nome_normalizado IS NOT NULL THEN 'Legado'
    WHEN lower(b.canal_raw) = 'urca' THEN 'Urca'
    WHEN lower(b.canal_raw) IN ('denise simôes', 'denise simões') THEN 'Denise Simões'
    ELSE b.canal_raw
  END AS canal,
  b.tipo_cliente, b.documento, b.comissao_bruta_tailor, b.source_origin, b.source_row_id
FROM base b
LEFT JOIN desligados_set d_banker  ON lower(b.banker_raw)  = d_banker.nome_normalizado
LEFT JOIN desligados_set d_advisor ON lower(b.advisor_raw) = d_advisor.nome_normalizado
LEFT JOIN desligados_set d_finder  ON lower(b.finder_raw)  = d_finder.nome_normalizado
LEFT JOIN desligados_set d_canal   ON lower(b.canal_raw)   = d_canal.nome_normalizado;

GRANT SELECT ON public.mv_comissoes_caixa_completa TO authenticated;

CREATE INDEX idx_mv_caixa_anomes_categoria ON public.mv_comissoes_caixa_completa(anomes, categoria);
CREATE INDEX idx_mv_caixa_anomes_banker ON public.mv_comissoes_caixa_completa(anomes, banker);
CREATE INDEX idx_mv_caixa_anomes_finder ON public.mv_comissoes_caixa_completa(anomes, finder);
CREATE INDEX idx_mv_caixa_anomes_advisor ON public.mv_comissoes_caixa_completa(anomes, advisor);
CREATE INDEX idx_mv_caixa_anomes_canal ON public.mv_comissoes_caixa_completa(anomes, canal);
CREATE INDEX idx_mv_caixa_documento ON public.mv_comissoes_caixa_completa(documento);

-- Compatibility view
CREATE OR REPLACE VIEW public.vw_comissoes_caixa_completa AS
SELECT * FROM public.mv_comissoes_caixa_completa;

GRANT SELECT ON public.vw_comissoes_caixa_completa TO authenticated;

-- Repoint all rpc_receita_caixa_* functions to MV
DO $repoint$
DECLARE
  fn record;
  src text;
  newsrc text;
BEGIN
  FOR fn IN
    SELECT p.oid, p.proname,
           pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname LIKE 'rpc_receita_caixa_%'
  LOOP
    src := pg_get_functiondef(fn.oid);
    newsrc := regexp_replace(src, 'vw_comissoes_caixa_completa', 'mv_comissoes_caixa_completa', 'g');
    IF newsrc <> src THEN
      EXECUTE newsrc;
    END IF;
  END LOOP;
END
$repoint$;

-- Refresh function + cron
CREATE OR REPLACE FUNCTION public.refresh_mv_caixa_completa()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.mv_comissoes_caixa_completa;
END;
$$;

-- Remove existing cron job if present, then schedule
DO $cron$
BEGIN
  PERFORM cron.unschedule('refresh-mv-caixa-completa')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-mv-caixa-completa');
EXCEPTION WHEN OTHERS THEN NULL;
END
$cron$;

SELECT cron.schedule(
  'refresh-mv-caixa-completa',
  '*/15 * * * *',
  $$SELECT public.refresh_mv_caixa_completa();$$
);

REFRESH MATERIALIZED VIEW public.mv_comissoes_caixa_completa;
