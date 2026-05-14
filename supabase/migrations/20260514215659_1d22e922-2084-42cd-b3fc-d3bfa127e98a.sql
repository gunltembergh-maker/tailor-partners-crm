
-- ============================================================
-- 1) View com camada de normalização
-- ============================================================
CREATE OR REPLACE VIEW public.vw_comissoes_caixa_completa AS
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
      IN (SELECT DISTINCT to_char(((h.data ->> 'Data')::date)::timestamp with time zone, 'YYYYMM')::integer
          FROM raw_comissoes_historico h WHERE (h.data ->> 'Data') IS NOT NULL)
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
  b.anomes,
  b.categoria,
  b.subcategoria,
  b.produto,
  b.subproduto,
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
  b.tipo_cliente,
  b.documento,
  b.comissao_bruta_tailor,
  b.source_origin,
  b.source_row_id
FROM base b
LEFT JOIN desligados_set d_banker  ON lower(b.banker_raw)  = d_banker.nome_normalizado
LEFT JOIN desligados_set d_advisor ON lower(b.advisor_raw) = d_advisor.nome_normalizado
LEFT JOIN desligados_set d_finder  ON lower(b.finder_raw)  = d_finder.nome_normalizado
LEFT JOIN desligados_set d_canal   ON lower(b.canal_raw)   = d_canal.nome_normalizado;

GRANT SELECT ON public.vw_comissoes_caixa_completa TO authenticated;

-- ============================================================
-- 2) Refresh do cache materializado
-- ============================================================
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_comissoes_caixa_completa;

-- ============================================================
-- 3) Recriar 7 RPCs com novo parâmetro p_canal
-- ============================================================
DROP FUNCTION IF EXISTS public.rpc_receita_caixa_kpis(integer, text[], text[], text[], text[], text[], text[]);
DROP FUNCTION IF EXISTS public.rpc_receita_caixa_por_categoria(integer, text[], text[], text[], text[], text[], text[]);
DROP FUNCTION IF EXISTS public.rpc_receita_caixa_por_subcategoria(integer, text[], text[], text[], text[], text[], text[]);
DROP FUNCTION IF EXISTS public.rpc_receita_caixa_serie_temporal(integer, text[], text[], text[], text[], text[], text[]);
DROP FUNCTION IF EXISTS public.rpc_receita_caixa_por_assessor(integer, text[], text[], text[], text[], text[], text[]);
DROP FUNCTION IF EXISTS public.rpc_receita_caixa_advisor_xp(integer, text[], text[], text[], text[], text[], text[]);
DROP FUNCTION IF EXISTS public.rpc_receita_caixa_filtros();

-- KPIs
CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_kpis(
  p_anomes integer,
  p_banker text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_categoria text[] DEFAULT NULL,
  p_subcategoria text[] DEFAULT NULL,
  p_canal text[] DEFAULT NULL,
  p_tipo_pessoa text[] DEFAULT NULL
) RETURNS TABLE(total_mes numeric, total_mes_anterior numeric, variacao_pct numeric, n_clientes_unicos integer, anomes_label text, anomes_anterior_label text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_ant integer;
BEGIN
  IF (p_anomes % 100) = 1 THEN v_ant := ((p_anomes / 100) - 1) * 100 + 12;
  ELSE v_ant := p_anomes - 1; END IF;

  RETURN QUERY
  WITH base AS (
    SELECT v.anomes, v.comissao_bruta_tailor, v.documento
    FROM mv_comissoes_caixa_completa v
    WHERE v.anomes IN (p_anomes, v_ant)
      AND (p_banker IS NULL OR v.banker = ANY(p_banker))
      AND (p_finder IS NULL OR v.finder = ANY(p_finder))
      AND (p_advisor IS NULL OR v.advisor = ANY(p_advisor))
      AND (p_categoria IS NULL OR v.categoria = ANY(p_categoria))
      AND (p_subcategoria IS NULL OR v.subcategoria = ANY(p_subcategoria))
      AND (p_canal IS NULL OR v.canal = ANY(p_canal))
      AND (p_tipo_pessoa IS NULL OR
           (('PF' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 11)
            OR ('PJ' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 14)))
      AND (get_user_banker_filter() IS NULL OR v.banker = ANY(get_user_banker_filter()))
      AND (get_user_finder_filter() IS NULL OR v.finder = ANY(get_user_finder_filter()))
  ), tot AS (
    SELECT
      ROUND(COALESCE(SUM(comissao_bruta_tailor) FILTER (WHERE anomes = p_anomes),0)::numeric,2) AS t_atual,
      ROUND(COALESCE(SUM(comissao_bruta_tailor) FILTER (WHERE anomes = v_ant),0)::numeric,2)    AS t_ant,
      COUNT(DISTINCT documento) FILTER (WHERE anomes = p_anomes)::int AS n_cli
    FROM base
  )
  SELECT
    tot.t_atual,
    tot.t_ant,
    CASE WHEN tot.t_ant = 0 THEN NULL ELSE ROUND(((tot.t_atual - tot.t_ant)/tot.t_ant)*100,2) END,
    tot.n_cli,
    to_char(to_date(p_anomes::text,'YYYYMM'),'Mon/YYYY'),
    to_char(to_date(v_ant::text,'YYYYMM'),'Mon/YYYY')
  FROM tot;
END;$$;

-- por_categoria
CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_por_categoria(
  p_anomes integer, p_banker text[] DEFAULT NULL, p_finder text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL, p_categoria text[] DEFAULT NULL, p_subcategoria text[] DEFAULT NULL,
  p_canal text[] DEFAULT NULL, p_tipo_pessoa text[] DEFAULT NULL
) RETURNS TABLE(categoria text, total numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT v.categoria, ROUND(SUM(v.comissao_bruta_tailor)::numeric,2) AS total
  FROM mv_comissoes_caixa_completa v
  WHERE v.anomes = p_anomes
    AND (p_banker IS NULL OR v.banker = ANY(p_banker))
    AND (p_finder IS NULL OR v.finder = ANY(p_finder))
    AND (p_advisor IS NULL OR v.advisor = ANY(p_advisor))
    AND (p_categoria IS NULL OR v.categoria = ANY(p_categoria))
    AND (p_subcategoria IS NULL OR v.subcategoria = ANY(p_subcategoria))
    AND (p_canal IS NULL OR v.canal = ANY(p_canal))
    AND (p_tipo_pessoa IS NULL OR
         (('PF' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 11)
          OR ('PJ' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 14)))
    AND (get_user_banker_filter() IS NULL OR v.banker = ANY(get_user_banker_filter()))
    AND (get_user_finder_filter() IS NULL OR v.finder = ANY(get_user_finder_filter()))
  GROUP BY v.categoria
  ORDER BY total DESC NULLS LAST;
$$;

-- por_subcategoria
CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_por_subcategoria(
  p_anomes integer, p_banker text[] DEFAULT NULL, p_finder text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL, p_categoria text[] DEFAULT NULL, p_subcategoria text[] DEFAULT NULL,
  p_canal text[] DEFAULT NULL, p_tipo_pessoa text[] DEFAULT NULL
) RETURNS TABLE(categoria text, subcategoria text, total_subcategoria numeric, total_categoria numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH f AS (
    SELECT v.categoria, COALESCE(v.subcategoria,'(sem subcategoria)') AS subcategoria, v.comissao_bruta_tailor
    FROM mv_comissoes_caixa_completa v
    WHERE v.anomes = p_anomes
      AND (p_banker IS NULL OR v.banker = ANY(p_banker))
      AND (p_finder IS NULL OR v.finder = ANY(p_finder))
      AND (p_advisor IS NULL OR v.advisor = ANY(p_advisor))
      AND (p_categoria IS NULL OR v.categoria = ANY(p_categoria))
      AND (p_subcategoria IS NULL OR v.subcategoria = ANY(p_subcategoria))
      AND (p_canal IS NULL OR v.canal = ANY(p_canal))
      AND (p_tipo_pessoa IS NULL OR
           (('PF' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 11)
            OR ('PJ' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 14)))
      AND (get_user_banker_filter() IS NULL OR v.banker = ANY(get_user_banker_filter()))
      AND (get_user_finder_filter() IS NULL OR v.finder = ANY(get_user_finder_filter()))
  ), agg AS (
    SELECT categoria, subcategoria, ROUND(SUM(comissao_bruta_tailor)::numeric,2) AS total_subcategoria
    FROM f GROUP BY categoria, subcategoria
  ), tot AS (
    SELECT categoria, ROUND(SUM(comissao_bruta_tailor)::numeric,2) AS total_categoria
    FROM f GROUP BY categoria
  )
  SELECT a.categoria, a.subcategoria, a.total_subcategoria, t.total_categoria
  FROM agg a JOIN tot t USING (categoria)
  ORDER BY t.total_categoria DESC NULLS LAST, a.total_subcategoria DESC NULLS LAST;
$$;

-- serie_temporal
CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_serie_temporal(
  p_anomes integer, p_banker text[] DEFAULT NULL, p_finder text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL, p_categoria text[] DEFAULT NULL, p_subcategoria text[] DEFAULT NULL,
  p_canal text[] DEFAULT NULL, p_tipo_pessoa text[] DEFAULT NULL
) RETURNS TABLE(anomes integer, anomes_label text, categoria text, total numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_start date; v_end date;
BEGIN
  v_end := to_date(p_anomes::text,'YYYYMM');
  v_start := v_end - INTERVAL '11 months';
  RETURN QUERY
  SELECT v.anomes,
         to_char(to_date(v.anomes::text,'YYYYMM'),'Mon/YY') AS anomes_label,
         v.categoria,
         ROUND(SUM(v.comissao_bruta_tailor)::numeric,2) AS total
  FROM mv_comissoes_caixa_completa v
  WHERE v.anomes BETWEEN to_char(v_start,'YYYYMM')::integer AND p_anomes
    AND (p_banker IS NULL OR v.banker = ANY(p_banker))
    AND (p_finder IS NULL OR v.finder = ANY(p_finder))
    AND (p_advisor IS NULL OR v.advisor = ANY(p_advisor))
    AND (p_categoria IS NULL OR v.categoria = ANY(p_categoria))
    AND (p_subcategoria IS NULL OR v.subcategoria = ANY(p_subcategoria))
    AND (p_canal IS NULL OR v.canal = ANY(p_canal))
    AND (p_tipo_pessoa IS NULL OR
         (('PF' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 11)
          OR ('PJ' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 14)))
    AND (get_user_banker_filter() IS NULL OR v.banker = ANY(get_user_banker_filter()))
    AND (get_user_finder_filter() IS NULL OR v.finder = ANY(get_user_finder_filter()))
  GROUP BY v.anomes, v.categoria
  ORDER BY v.anomes ASC, total DESC;
END;$$;

-- por_assessor
CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_por_assessor(
  p_anomes integer, p_banker text[] DEFAULT NULL, p_finder text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL, p_categoria text[] DEFAULT NULL, p_subcategoria text[] DEFAULT NULL,
  p_canal text[] DEFAULT NULL, p_tipo_pessoa text[] DEFAULT NULL
) RETURNS TABLE(banker text, categoria text, total numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT COALESCE(v.banker,'(sem FA)') AS banker, v.categoria,
         ROUND(SUM(v.comissao_bruta_tailor)::numeric,2) AS total
  FROM mv_comissoes_caixa_completa v
  WHERE v.anomes = p_anomes
    AND (p_banker IS NULL OR v.banker = ANY(p_banker))
    AND (p_finder IS NULL OR v.finder = ANY(p_finder))
    AND (p_advisor IS NULL OR v.advisor = ANY(p_advisor))
    AND (p_categoria IS NULL OR v.categoria = ANY(p_categoria))
    AND (p_subcategoria IS NULL OR v.subcategoria = ANY(p_subcategoria))
    AND (p_canal IS NULL OR v.canal = ANY(p_canal))
    AND (p_tipo_pessoa IS NULL OR
         (('PF' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 11)
          OR ('PJ' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 14)))
    AND (get_user_banker_filter() IS NULL OR v.banker = ANY(get_user_banker_filter()))
    AND (get_user_finder_filter() IS NULL OR v.finder = ANY(get_user_finder_filter()))
  GROUP BY 1, 2;
$$;

-- advisor_xp
CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_advisor_xp(
  p_anomes integer, p_banker text[] DEFAULT NULL, p_finder text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL, p_categoria text[] DEFAULT NULL, p_subcategoria text[] DEFAULT NULL,
  p_canal text[] DEFAULT NULL, p_tipo_pessoa text[] DEFAULT NULL
) RETURNS TABLE(advisor text, total numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT COALESCE(NULLIF(TRIM(v.advisor),''),'Sem Advisor') AS advisor,
         ROUND(SUM(v.comissao_bruta_tailor)::numeric,2) AS total
  FROM mv_comissoes_caixa_completa v
  WHERE v.anomes = p_anomes
    AND v.categoria = 'Assessoria'
    AND (p_banker IS NULL OR v.banker = ANY(p_banker))
    AND (p_finder IS NULL OR v.finder = ANY(p_finder))
    AND (p_advisor IS NULL OR v.advisor = ANY(p_advisor))
    AND (p_subcategoria IS NULL OR v.subcategoria = ANY(p_subcategoria))
    AND (p_canal IS NULL OR v.canal = ANY(p_canal))
    AND (p_tipo_pessoa IS NULL OR
         (('PF' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 11)
          OR ('PJ' = ANY(p_tipo_pessoa) AND length(regexp_replace(coalesce(v.documento,''), '[^0-9]', '', 'g')) = 14)))
    AND (get_user_banker_filter() IS NULL OR v.banker = ANY(get_user_banker_filter()))
    AND (get_user_finder_filter() IS NULL OR v.finder = ANY(get_user_finder_filter()))
  GROUP BY 1
  ORDER BY total DESC NULLS LAST;
$$;

-- filtros (com canais)
CREATE OR REPLACE FUNCTION public.rpc_receita_caixa_filtros()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_bf text[] := get_user_banker_filter();
  v_ff text[] := get_user_finder_filter();
  v_result jsonb;
BEGIN
  WITH scoped AS (
    SELECT * FROM mv_comissoes_caixa_completa v
    WHERE (v_bf IS NULL OR v.banker = ANY(v_bf))
      AND (v_ff IS NULL OR v.finder = ANY(v_ff))
  )
  SELECT jsonb_build_object(
    'anomes_disponiveis', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('anomes', a, 'label', to_char(to_date(a::text,'YYYYMM'),'Mon/YYYY')) ORDER BY a DESC), '[]'::jsonb)
      FROM (SELECT DISTINCT anomes AS a FROM scoped WHERE anomes IS NOT NULL) x
    ),
    'bankers',       (SELECT COALESCE(jsonb_agg(DISTINCT banker ORDER BY banker), '[]'::jsonb) FROM scoped WHERE banker IS NOT NULL AND TRIM(banker) <> ''),
    'finders',       (SELECT COALESCE(jsonb_agg(DISTINCT finder ORDER BY finder), '[]'::jsonb) FROM scoped WHERE finder IS NOT NULL AND TRIM(finder) <> ''),
    'advisors',      (SELECT COALESCE(jsonb_agg(DISTINCT advisor ORDER BY advisor), '[]'::jsonb) FROM scoped WHERE advisor IS NOT NULL AND TRIM(advisor) <> ''),
    'canais',        (SELECT COALESCE(jsonb_agg(DISTINCT canal ORDER BY canal), '[]'::jsonb) FROM scoped WHERE canal IS NOT NULL AND TRIM(canal) <> ''),
    'categorias',    (SELECT COALESCE(jsonb_agg(DISTINCT categoria ORDER BY categoria), '[]'::jsonb) FROM scoped WHERE categoria IS NOT NULL),
    'subcategorias', (SELECT COALESCE(jsonb_agg(DISTINCT subcategoria ORDER BY subcategoria), '[]'::jsonb) FROM scoped WHERE subcategoria IS NOT NULL)
  ) INTO v_result;
  RETURN v_result;
END;$$;

GRANT EXECUTE ON FUNCTION public.rpc_receita_caixa_kpis(integer, text[], text[], text[], text[], text[], text[], text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_receita_caixa_por_categoria(integer, text[], text[], text[], text[], text[], text[], text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_receita_caixa_por_subcategoria(integer, text[], text[], text[], text[], text[], text[], text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_receita_caixa_serie_temporal(integer, text[], text[], text[], text[], text[], text[], text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_receita_caixa_por_assessor(integer, text[], text[], text[], text[], text[], text[], text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_receita_caixa_advisor_xp(integer, text[], text[], text[], text[], text[], text[], text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_receita_caixa_filtros() TO authenticated;
