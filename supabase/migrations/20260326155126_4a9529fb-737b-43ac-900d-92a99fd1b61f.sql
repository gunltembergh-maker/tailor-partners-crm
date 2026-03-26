-- Fix rpc_auc_faixa_pl_qualitativo: remove ordem_pl reference (not in view)
CREATE OR REPLACE FUNCTION public.rpc_auc_faixa_pl_qualitativo(
  p_anomes integer[] DEFAULT NULL::integer[],
  p_banker text[] DEFAULT NULL::text[],
  p_documento text[] DEFAULT NULL::text[],
  p_advisor text[] DEFAULT NULL::text[],
  p_finder text[] DEFAULT NULL::text[],
  p_tipo_cliente text[] DEFAULT NULL::text[]
)
RETURNS TABLE(faixa_pl text, auc numeric, clientes bigint, pl_declarado numeric, ordem_pl integer)
LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT p.faixa_pl, SUM(p.net_em_m), COUNT(DISTINCT p.documento),
    SUM(p.pl_declarado_ajustado),
    CASE p.faixa_pl
      WHEN 'Inativo' THEN 0
      WHEN '-300k' THEN 1
      WHEN '300k-500k' THEN 2
      WHEN '500k-1M' THEN 3
      WHEN '1-3M' THEN 4
      WHEN '3-5M' THEN 5
      WHEN '5-10M' THEN 6
      WHEN '+10M' THEN 7
      ELSE 99
    END::integer
  FROM view_positivador_agrupado p
  WHERE (p_anomes IS NULL OR p.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR p.banker = ANY(v_bf))
    AND (p_documento IS NULL OR p.documento = ANY(p_documento))
    AND (v_af IS NULL OR p.advisor = ANY(v_af))
    AND (v_ff IS NULL OR p.finder = ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR p.tipo_cliente = ANY(p_tipo_cliente))
    AND p.faixa_pl IS NOT NULL
  GROUP BY 1 ORDER BY 5;
END;
$function$;

-- Fix rpc_roa_tipo_cliente: prefix CTE columns to avoid ambiguity
CREATE OR REPLACE FUNCTION public.rpc_roa_tipo_cliente(
  p_anomes integer[] DEFAULT NULL::integer[],
  p_banker text[] DEFAULT NULL::text[],
  p_documento text[] DEFAULT NULL::text[],
  p_advisor text[] DEFAULT NULL::text[],
  p_finder text[] DEFAULT NULL::text[],
  p_tipo_cliente text[] DEFAULT NULL::text[]
)
RETURNS TABLE(anomes integer, anomes_nome text, tipo_cliente text, roa numeric)
LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  WITH receita AS (
    SELECT c.anomes AS r_anomes, c.documento AS r_documento, SUM(c.comissao_bruta_tailor) AS receita_total
    FROM comissoes_consolidado_filtrado c
    WHERE (v_bf IS NULL OR c.banker = ANY(v_bf))
    GROUP BY c.anomes, c.documento
  )
  SELECT p.anomes, to_char(to_date(p.anomes::text,'YYYYMM'),'Mon/YY'),
    p.tipo_cliente,
    CASE WHEN SUM(p.net_em_m) > 0
      THEN ROUND((SUM(COALESCE(r.receita_total,0)) / SUM(p.net_em_m)) * 12 * 100, 4)
    ELSE 0 END
  FROM view_positivador_agrupado p
  LEFT JOIN receita r ON r.r_anomes = p.anomes AND r.r_documento = p.documento
  WHERE (p_anomes IS NULL OR p.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR p.banker = ANY(v_bf))
    AND (p_documento IS NULL OR p.documento = ANY(p_documento))
    AND (v_af IS NULL OR p.advisor = ANY(v_af))
    AND (v_ff IS NULL OR p.finder = ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR p.tipo_cliente = ANY(p_tipo_cliente))
  GROUP BY 1,2,3 ORDER BY 1;
END;
$function$;

-- Fix rpc_roa_faixa_pl: prefix CTE columns
CREATE OR REPLACE FUNCTION public.rpc_roa_faixa_pl(
  p_anomes integer[] DEFAULT NULL::integer[],
  p_banker text[] DEFAULT NULL::text[],
  p_documento text[] DEFAULT NULL::text[],
  p_advisor text[] DEFAULT NULL::text[],
  p_finder text[] DEFAULT NULL::text[],
  p_tipo_cliente text[] DEFAULT NULL::text[]
)
RETURNS TABLE(anomes integer, anomes_nome text, faixa_pl text, roa numeric)
LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  WITH receita AS (
    SELECT c.anomes AS r_anomes, c.documento AS r_documento, SUM(c.comissao_bruta_tailor) AS receita_total
    FROM comissoes_consolidado_filtrado c
    WHERE (v_bf IS NULL OR c.banker = ANY(v_bf))
    GROUP BY c.anomes, c.documento
  )
  SELECT p.anomes, to_char(to_date(p.anomes::text,'YYYYMM'),'Mon/YY'),
    p.faixa_pl,
    CASE WHEN SUM(p.net_em_m) > 0
      THEN ROUND((SUM(COALESCE(r.receita_total,0)) / SUM(p.net_em_m)) * 12 * 100, 4)
    ELSE 0 END
  FROM view_positivador_agrupado p
  LEFT JOIN receita r ON r.r_anomes = p.anomes AND r.r_documento = p.documento
  WHERE (p_anomes IS NULL OR p.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR p.banker = ANY(v_bf))
    AND (p_documento IS NULL OR p.documento = ANY(p_documento))
    AND (v_af IS NULL OR p.advisor = ANY(v_af))
    AND (v_ff IS NULL OR p.finder = ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR p.tipo_cliente = ANY(p_tipo_cliente))
    AND p.faixa_pl IS NOT NULL
  GROUP BY 1,2,3 ORDER BY 1;
END;
$function$;

-- Fix rpc_roa_m0_tabela: prefix CTE columns
CREATE OR REPLACE FUNCTION public.rpc_roa_m0_tabela(
  p_anomes integer[] DEFAULT NULL::integer[],
  p_banker text[] DEFAULT NULL::text[],
  p_documento text[] DEFAULT NULL::text[],
  p_advisor text[] DEFAULT NULL::text[],
  p_finder text[] DEFAULT NULL::text[],
  p_tipo_cliente text[] DEFAULT NULL::text[]
)
RETURNS TABLE(documento text, faixa_pl text, roa numeric)
LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  WITH receita AS (
    SELECT c.anomes AS r_anomes, c.documento AS r_documento, SUM(c.comissao_bruta_tailor) AS receita_total
    FROM comissoes_consolidado_filtrado c
    WHERE (v_bf IS NULL OR c.banker = ANY(v_bf))
    GROUP BY c.anomes, c.documento
  )
  SELECT p.documento, p.faixa_pl,
    CASE WHEN SUM(p.net_em_m) > 0
      THEN ROUND((SUM(COALESCE(r.receita_total,0)) / SUM(p.net_em_m)) * 12 * 100, 4)
    ELSE 0 END
  FROM view_positivador_agrupado p
  LEFT JOIN receita r ON r.r_anomes = p.anomes AND r.r_documento = p.documento
  WHERE (p_anomes IS NULL OR p.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR p.banker = ANY(v_bf))
    AND (p_documento IS NULL OR p.documento = ANY(p_documento))
    AND (v_af IS NULL OR p.advisor = ANY(v_af))
    AND (v_ff IS NULL OR p.finder = ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR p.tipo_cliente = ANY(p_tipo_cliente))
    AND p.faixa_pl IS NOT NULL
  GROUP BY 1,2 ORDER BY 3 DESC;
END;
$function$;