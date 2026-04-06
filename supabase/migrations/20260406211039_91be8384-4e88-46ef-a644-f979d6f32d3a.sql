CREATE OR REPLACE VIEW public.comissoes_consolidado_receita_corrigida AS
SELECT
  to_char((r.data ->> 'Data')::date, 'YYYYMM')::integer AS anomes,
  fix_encoding(r.data ->> 'Categoria') AS categoria,
  fix_encoding(r.data ->> 'Subcategoria') AS subcategoria,
  fix_encoding(r.data ->> 'Produto') AS produto,
  fix_encoding(r.data ->> 'Subproduto') AS subproduto,
  CASE
    WHEN NULLIF(TRIM(r.data ->> 'Banker'), '') IN ('Enrico Santos', 'Nicholas Barbarisi') THEN 'Richard S'
    WHEN NULLIF(TRIM(r.data ->> 'Banker'), '') = 'Murilo Jacob' THEN 'Gustavo Faria'
    ELSE r.data ->> 'Banker'
  END AS banker,
  r.data ->> 'Advisor' AS advisor,
  r.data ->> 'Finder' AS finder,
  r.data ->> 'Canal' AS canal,
  r.data ->> 'Tipo de Cliente' AS tipo_cliente,
  COALESCE(NULLIF(TRIM(r.data ->> 'Documento'), ''), NULLIF(TRIM(r.data ->> 'Cliente'), '')) AS documento,
  parse_num(COALESCE(r.data ->> 'Comissão Bruta Tailor', r.data ->> 'ComissÃ£o Bruta Tailor')) AS comissao_bruta_tailor,
  'm0'::text AS source_origin,
  r.id AS source_row_id
FROM public.raw_comissoes_m0 r
WHERE (r.data ->> 'Data') IS NOT NULL
  AND (r.data ->> 'Categoria') IS NOT NULL
  AND COALESCE(r.data ->> 'Banker', '') <> 'Lavoro'
  AND NOT (
    to_char((r.data ->> 'Data')::date, 'YYYYMM')::integer IN (
      SELECT DISTINCT to_char((h.data ->> 'Data')::date, 'YYYYMM')::integer
      FROM public.raw_comissoes_historico h
      WHERE (h.data ->> 'Data') IS NOT NULL
    )
  )
UNION ALL
SELECT
  to_char((r.data ->> 'Data')::date, 'YYYYMM')::integer AS anomes,
  fix_encoding(r.data ->> 'Categoria') AS categoria,
  fix_encoding(r.data ->> 'Subcategoria') AS subcategoria,
  fix_encoding(r.data ->> 'Produto') AS produto,
  fix_encoding(r.data ->> 'Subproduto') AS subproduto,
  CASE
    WHEN NULLIF(TRIM(r.data ->> 'Banker'), '') IN ('Enrico Santos', 'Nicholas Barbarisi') THEN 'Richard S'
    WHEN NULLIF(TRIM(r.data ->> 'Banker'), '') = 'Murilo Jacob' THEN 'Gustavo Faria'
    ELSE r.data ->> 'Banker'
  END AS banker,
  r.data ->> 'Advisor' AS advisor,
  r.data ->> 'Finder' AS finder,
  r.data ->> 'Canal' AS canal,
  r.data ->> 'Tipo de Cliente' AS tipo_cliente,
  COALESCE(NULLIF(TRIM(r.data ->> 'Documento'), ''), NULLIF(TRIM(r.data ->> 'Cliente'), '')) AS documento,
  parse_num(COALESCE(r.data ->> 'Comissão Bruta Tailor', r.data ->> 'ComissÃ£o Bruta Tailor')) AS comissao_bruta_tailor,
  'historico'::text AS source_origin,
  r.id AS source_row_id
FROM public.raw_comissoes_historico r
WHERE (r.data ->> 'Data') IS NOT NULL
  AND (r.data ->> 'Categoria') IS NOT NULL
  AND COALESCE(r.data ->> 'Banker', '') <> 'Lavoro';

DROP MATERIALIZED VIEW IF EXISTS public.mv_comissoes_consolidado_v2;

CREATE MATERIALIZED VIEW public.mv_comissoes_consolidado_v2 AS
SELECT *
FROM public.comissoes_consolidado_receita_corrigida;

CREATE UNIQUE INDEX mv_comissoes_consolidado_v2_source_idx
  ON public.mv_comissoes_consolidado_v2 (source_origin, source_row_id);

CREATE INDEX idx_mv_comissoes_v2_anomes
  ON public.mv_comissoes_consolidado_v2 (anomes);

CREATE INDEX idx_mv_comissoes_v2_banker
  ON public.mv_comissoes_consolidado_v2 (banker);

CREATE INDEX idx_mv_comissoes_v2_finder
  ON public.mv_comissoes_consolidado_v2 (finder);

CREATE INDEX idx_mv_comissoes_v2_categoria
  ON public.mv_comissoes_consolidado_v2 (categoria);

CREATE OR REPLACE FUNCTION public.rpc_receita_total(
  p_anomes integer[] DEFAULT NULL::integer[],
  p_banker text[] DEFAULT NULL::text[],
  p_finder text[] DEFAULT NULL::text[]
)
RETURNS TABLE(receita numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT COALESCE(SUM(comissao_bruta_tailor), 0)
  FROM public.mv_comissoes_consolidado_v2
  WHERE (p_anomes IS NULL OR anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR banker = ANY(v_bf))
    AND (v_ff IS NULL OR finder = ANY(v_ff));
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_receita_mes_categoria(
  p_anomes integer[] DEFAULT NULL::integer[],
  p_banker text[] DEFAULT NULL::text[],
  p_finder text[] DEFAULT NULL::text[]
)
RETURNS TABLE(anomes integer, anomes_nome text, categoria text, valor numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT c.anomes, to_char(to_date(c.anomes::text, 'YYYYMM'), 'Mon/YY'), c.categoria, SUM(c.comissao_bruta_tailor)
  FROM public.mv_comissoes_consolidado_v2 c
  WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR c.banker = ANY(v_bf))
    AND (v_ff IS NULL OR c.finder = ANY(v_ff))
    AND c.categoria IS NOT NULL
  GROUP BY 1, 2, 3
  ORDER BY 1, 3;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_receita_treemap_categoria(
  p_anomes integer[] DEFAULT NULL::integer[],
  p_banker text[] DEFAULT NULL::text[],
  p_finder text[] DEFAULT NULL::text[]
)
RETURNS TABLE(categoria text, valor numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT c.categoria, SUM(c.comissao_bruta_tailor)
  FROM public.mv_comissoes_consolidado_v2 c
  WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR c.banker = ANY(v_bf))
    AND (v_ff IS NULL OR c.finder = ANY(v_ff))
    AND c.categoria IS NOT NULL
  GROUP BY 1
  ORDER BY 2 DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_receita_matriz_rows(
  p_anomes integer[] DEFAULT NULL::integer[],
  p_banker text[] DEFAULT NULL::text[],
  p_finder text[] DEFAULT NULL::text[]
)
RETURNS TABLE(anomes integer, anomes_nome text, categoria text, produto text, subcategoria text, subproduto text, valor numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT c.anomes, to_char(to_date(c.anomes::text, 'YYYYMM'), 'Mon/YY'), c.categoria, c.produto, c.subcategoria, c.subproduto, SUM(c.comissao_bruta_tailor)
  FROM public.mv_comissoes_consolidado_v2 c
  WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR c.banker = ANY(v_bf))
    AND (v_ff IS NULL OR c.finder = ANY(v_ff))
  GROUP BY 1, 2, 3, 4, 5, 6
  ORDER BY 1, 3, 4, 5, 6;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_receita_matriz_rows_cat(
  p_anomes integer[] DEFAULT NULL::integer[],
  p_banker text[] DEFAULT NULL::text[],
  p_finder text[] DEFAULT NULL::text[]
)
RETURNS TABLE(anomes integer, anomes_nome text, categoria text, valor numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT c.anomes, to_char(to_date(c.anomes::text, 'YYYYMM'), 'Mon/YY'), c.categoria, SUM(c.comissao_bruta_tailor)
  FROM public.mv_comissoes_consolidado_v2 c
  WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR c.banker = ANY(v_bf))
    AND (v_ff IS NULL OR c.finder = ANY(v_ff))
    AND c.categoria IS NOT NULL
  GROUP BY 1, 2, 3
  ORDER BY 1, 3;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_receita_drilldown(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_categoria text DEFAULT NULL,
  p_subcategoria text DEFAULT NULL,
  p_produto text DEFAULT NULL,
  p_finder text[] DEFAULT NULL
)
RETURNS TABLE(anomes int, anomes_nome text, categoria text, produto text, subcategoria text, subproduto text, documento text, valor numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  IF p_categoria IS NOT NULL AND p_subcategoria IS NOT NULL AND p_produto IS NOT NULL THEN
    RETURN QUERY
    SELECT c.anomes, to_char(to_date(c.anomes::text,'YYYYMM'),'Mon/YY'), c.categoria, c.produto, c.subcategoria, c.subproduto, c.documento, SUM(c.comissao_bruta_tailor)
    FROM public.mv_comissoes_consolidado_v2 c
    WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
      AND (v_bf IS NULL OR c.banker = ANY(v_bf))
      AND (v_ff IS NULL OR c.finder = ANY(v_ff))
      AND c.categoria = p_categoria
      AND c.subcategoria = p_subcategoria
      AND c.produto = p_produto
    GROUP BY 1,2,3,4,5,6,7
    ORDER BY 1,3,4,5,6,7;
  ELSE
    RETURN QUERY
    SELECT c.anomes, to_char(to_date(c.anomes::text,'YYYYMM'),'Mon/YY'), c.categoria, c.produto, c.subcategoria, c.subproduto, NULL::text, SUM(c.comissao_bruta_tailor)
    FROM public.mv_comissoes_consolidado_v2 c
    WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
      AND (v_bf IS NULL OR c.banker = ANY(v_bf))
      AND (v_ff IS NULL OR c.finder = ANY(v_ff))
      AND (p_categoria IS NULL OR c.categoria = p_categoria)
      AND (p_subcategoria IS NULL OR c.subcategoria = p_subcategoria)
      AND (p_produto IS NULL OR c.produto = p_produto)
    GROUP BY 1,2,3,4,5,6
    ORDER BY 1,3,4,5,6;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_roa_geral(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_tipo_cliente text[] DEFAULT NULL
)
RETURNS TABLE(anomes int, anomes_nome text, roa numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  WITH rec AS (
    SELECT c_inner.anomes AS r_anomes, c_inner.documento AS r_documento, SUM(c_inner.comissao_bruta_tailor) AS rt
    FROM public.mv_comissoes_consolidado_v2 c_inner
    WHERE (v_bf IS NULL OR c_inner.banker = ANY(v_bf))
    GROUP BY 1,2
  )
  SELECT p.anomes, to_char(to_date(p.anomes::text,'YYYYMM'),'Mon/YY'), CASE WHEN SUM(p.net_em_m)>0 THEN ROUND((SUM(COALESCE(r.rt,0))/SUM(p.net_em_m))*12*100,4) ELSE 0 END
  FROM public.view_positivador_agrupado p
  LEFT JOIN rec r ON r.r_anomes = p.anomes AND r.r_documento = p.documento
  WHERE (p_anomes IS NULL OR p.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR p.banker = ANY(v_bf))
    AND (p_documento IS NULL OR p.documento = ANY(p_documento))
    AND (v_af IS NULL OR p.advisor = ANY(v_af))
    AND (v_ff IS NULL OR p.finder = ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR p.tipo_cliente = ANY(p_tipo_cliente))
  GROUP BY 1,2
  ORDER BY 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_roa_tipo_cliente(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_tipo_cliente text[] DEFAULT NULL
)
RETURNS TABLE(anomes int, anomes_nome text, tipo_cliente text, roa numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  WITH rec AS (
    SELECT c_inner.anomes AS r_anomes, c_inner.documento AS r_documento, SUM(c_inner.comissao_bruta_tailor) AS rt
    FROM public.mv_comissoes_consolidado_v2 c_inner
    WHERE (v_bf IS NULL OR c_inner.banker = ANY(v_bf))
    GROUP BY c_inner.anomes, c_inner.documento
  )
  SELECT p.anomes, to_char(to_date(p.anomes::text,'YYYYMM'),'Mon/YY'), p.tipo_cliente, CASE WHEN SUM(p.net_em_m) > 0 THEN ROUND((SUM(COALESCE(r.rt,0)) / SUM(p.net_em_m)) * 12 * 100, 4) ELSE 0 END
  FROM public.view_positivador_agrupado p
  LEFT JOIN rec r ON r.r_anomes = p.anomes AND r.r_documento = p.documento
  WHERE (p_anomes IS NULL OR p.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR p.banker = ANY(v_bf))
    AND (p_documento IS NULL OR p.documento = ANY(p_documento))
    AND (v_af IS NULL OR p.advisor = ANY(v_af))
    AND (v_ff IS NULL OR p.finder = ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR p.tipo_cliente = ANY(p_tipo_cliente))
  GROUP BY p.anomes, to_char(to_date(p.anomes::text,'YYYYMM'),'Mon/YY'), p.tipo_cliente
  ORDER BY p.anomes;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_roa_faixa_pl(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_tipo_cliente text[] DEFAULT NULL
)
RETURNS TABLE(anomes int, anomes_nome text, faixa_pl text, roa numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  WITH rec AS (
    SELECT c_inner.anomes AS r_anomes, c_inner.documento AS r_documento, SUM(c_inner.comissao_bruta_tailor) AS rt
    FROM public.mv_comissoes_consolidado_v2 c_inner
    WHERE (v_bf IS NULL OR c_inner.banker = ANY(v_bf))
    GROUP BY c_inner.anomes, c_inner.documento
  )
  SELECT p.anomes, to_char(to_date(p.anomes::text,'YYYYMM'),'Mon/YY'), p.faixa_pl, CASE WHEN SUM(p.net_em_m) > 0 THEN ROUND((SUM(COALESCE(r.rt,0)) / SUM(p.net_em_m)) * 12 * 100, 4) ELSE 0 END
  FROM public.view_positivador_agrupado p
  LEFT JOIN rec r ON r.r_anomes = p.anomes AND r.r_documento = p.documento
  WHERE (p_anomes IS NULL OR p.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR p.banker = ANY(v_bf))
    AND (p_documento IS NULL OR p.documento = ANY(p_documento))
    AND (v_af IS NULL OR p.advisor = ANY(v_af))
    AND (v_ff IS NULL OR p.finder = ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR p.tipo_cliente = ANY(p_tipo_cliente))
    AND p.faixa_pl IS NOT NULL
  GROUP BY p.anomes, to_char(to_date(p.anomes::text,'YYYYMM'),'Mon/YY'), p.faixa_pl
  ORDER BY p.anomes;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_roa_m0_tabela(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_tipo_cliente text[] DEFAULT NULL
)
RETURNS TABLE(documento text, faixa_pl text, roa numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  WITH rec AS (
    SELECT c_inner.anomes AS r_anomes, c_inner.documento AS r_documento, SUM(c_inner.comissao_bruta_tailor) AS rt
    FROM public.mv_comissoes_consolidado_v2 c_inner
    WHERE (v_bf IS NULL OR c_inner.banker = ANY(v_bf))
    GROUP BY c_inner.anomes, c_inner.documento
  )
  SELECT p.documento, p.faixa_pl, CASE WHEN SUM(p.net_em_m) > 0 THEN ROUND((SUM(COALESCE(r.rt,0)) / SUM(p.net_em_m)) * 12 * 100, 4) ELSE 0 END
  FROM public.view_positivador_agrupado p
  LEFT JOIN rec r ON r.r_anomes = p.anomes AND r.r_documento = p.documento
  WHERE (p_anomes IS NULL OR p.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR p.banker = ANY(v_bf))
    AND (p_documento IS NULL OR p.documento = ANY(p_documento))
    AND (v_af IS NULL OR p.advisor = ANY(v_af))
    AND (v_ff IS NULL OR p.finder = ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR p.tipo_cliente = ANY(p_tipo_cliente))
    AND p.faixa_pl IS NOT NULL
  GROUP BY p.documento, p.faixa_pl
  ORDER BY 3 DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_refresh_mv_comissoes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_comissoes_consolidado_v2;
  REFRESH MATERIALIZED VIEW public.mv_dimensoes_filtro;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_refresh_mv_comissoes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_comissoes_consolidado_v2;
  RETURN NULL;
END;
$function$;