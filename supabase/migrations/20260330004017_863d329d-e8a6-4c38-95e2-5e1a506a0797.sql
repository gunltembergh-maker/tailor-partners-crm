CREATE OR REPLACE FUNCTION public.rpc_roa_faixa_pl(
  p_anomes integer[] DEFAULT NULL::integer[],
  p_banker text[] DEFAULT NULL::text[],
  p_documento text[] DEFAULT NULL::text[],
  p_advisor text[] DEFAULT NULL::text[],
  p_finder text[] DEFAULT NULL::text[],
  p_tipo_cliente text[] DEFAULT NULL::text[]
)
RETURNS TABLE(anomes integer, anomes_nome text, faixa_pl text, roa numeric)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  WITH rec AS (
    SELECT c.anomes AS r_anomes, c.documento AS r_documento, SUM(c.comissao_bruta_tailor) AS rt
    FROM mv_comissoes_consolidado c
    WHERE (v_bf IS NULL OR c.banker = ANY(v_bf))
    GROUP BY c.anomes, c.documento
  )
  SELECT p.anomes, to_char(to_date(p.anomes::text,'YYYYMM'),'Mon/YY'), p.faixa_pl,
    CASE WHEN SUM(p.net_em_m) > 0
      THEN ROUND((SUM(COALESCE(r.rt,0)) / SUM(p.net_em_m)) * 12 * 100, 4) ELSE 0 END
  FROM view_positivador_agrupado p
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

CREATE OR REPLACE FUNCTION public.rpc_roa_tipo_cliente(
  p_anomes integer[] DEFAULT NULL::integer[],
  p_banker text[] DEFAULT NULL::text[],
  p_documento text[] DEFAULT NULL::text[],
  p_advisor text[] DEFAULT NULL::text[],
  p_finder text[] DEFAULT NULL::text[],
  p_tipo_cliente text[] DEFAULT NULL::text[]
)
RETURNS TABLE(anomes integer, anomes_nome text, tipo_cliente text, roa numeric)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  WITH rec AS (
    SELECT c.anomes AS r_anomes, c.documento AS r_documento, SUM(c.comissao_bruta_tailor) AS rt
    FROM mv_comissoes_consolidado c
    WHERE (v_bf IS NULL OR c.banker = ANY(v_bf))
    GROUP BY c.anomes, c.documento
  )
  SELECT p.anomes, to_char(to_date(p.anomes::text,'YYYYMM'),'Mon/YY'), p.tipo_cliente,
    CASE WHEN SUM(p.net_em_m) > 0
      THEN ROUND((SUM(COALESCE(r.rt,0)) / SUM(p.net_em_m)) * 12 * 100, 4) ELSE 0 END
  FROM view_positivador_agrupado p
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

CREATE OR REPLACE FUNCTION public.rpc_roa_m0_tabela(
  p_anomes integer[] DEFAULT NULL::integer[],
  p_banker text[] DEFAULT NULL::text[],
  p_documento text[] DEFAULT NULL::text[],
  p_advisor text[] DEFAULT NULL::text[],
  p_finder text[] DEFAULT NULL::text[],
  p_tipo_cliente text[] DEFAULT NULL::text[]
)
RETURNS TABLE(documento text, faixa_pl text, roa numeric)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  WITH rec AS (
    SELECT c.anomes AS r_anomes, c.documento AS r_documento, SUM(c.comissao_bruta_tailor) AS rt
    FROM mv_comissoes_consolidado c
    WHERE (v_bf IS NULL OR c.banker = ANY(v_bf))
    GROUP BY c.anomes, c.documento
  )
  SELECT p.documento, p.faixa_pl,
    CASE WHEN SUM(p.net_em_m) > 0
      THEN ROUND((SUM(COALESCE(r.rt,0)) / SUM(p.net_em_m)) * 12 * 100, 4) ELSE 0 END
  FROM view_positivador_agrupado p
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