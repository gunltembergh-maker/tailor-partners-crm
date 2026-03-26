
-- Fix rpc_auc_faixa_pl_qualitativo: ordem_pl does not exist in view_positivador_agrupado
CREATE OR REPLACE FUNCTION public.rpc_auc_faixa_pl_qualitativo(
  p_anomes integer[] DEFAULT NULL, p_banker text[] DEFAULT NULL,
  p_documento text[] DEFAULT NULL, p_advisor text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL, p_tipo_cliente text[] DEFAULT NULL
)
RETURNS TABLE(faixa_pl text, auc numeric, clientes bigint, pl_declarado numeric, ordem_pl integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT vp.faixa_pl,
         SUM(vp.net_em_m),
         COUNT(DISTINCT vp.documento),
         SUM(vp.pl_declarado_ajustado),
         CASE vp.faixa_pl
           WHEN 'Inativo'   THEN 0
           WHEN '-300k'     THEN 1
           WHEN '300k-500k' THEN 2
           WHEN '500k-1M'   THEN 3
           WHEN '1-3M'      THEN 4
           WHEN '3-5M'      THEN 5
           WHEN '5-10M'     THEN 6
           WHEN '+10M'      THEN 7
           ELSE 8
         END
  FROM view_positivador_agrupado vp
  WHERE (p_anomes IS NULL OR vp.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR vp.banker = ANY(v_bf))
    AND (p_documento IS NULL OR vp.documento = ANY(p_documento))
    AND (v_af IS NULL OR vp.advisor = ANY(v_af))
    AND (v_ff IS NULL OR vp.finder = ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR vp.tipo_cliente = ANY(p_tipo_cliente))
    AND vp.faixa_pl IS NOT NULL
  GROUP BY 1
  ORDER BY 5;
END;
$function$;

-- Fix rpc_roa_faixa_pl: "anomes" ambiguous between RETURNS TABLE and CTE columns
CREATE OR REPLACE FUNCTION public.rpc_roa_faixa_pl(
  p_anomes integer[] DEFAULT NULL, p_banker text[] DEFAULT NULL,
  p_documento text[] DEFAULT NULL, p_advisor text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL, p_tipo_cliente text[] DEFAULT NULL
)
RETURNS TABLE(anomes integer, anomes_nome text, faixa_pl text, roa numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  WITH rec AS (
    SELECT c.anomes AS r_anomes, c.documento AS r_documento, SUM(c.comissao_bruta_tailor) AS rt
    FROM comissoes_consolidado_filtrado c
    WHERE (v_bf IS NULL OR c.banker = ANY(v_bf))
    GROUP BY c.anomes, c.documento
  )
  SELECT vp.anomes,
         to_char(to_date(vp.anomes::text,'YYYYMM'),'Mon/YY'),
         vp.faixa_pl,
         CASE WHEN SUM(vp.net_em_m) > 0
              THEN ROUND((SUM(COALESCE(r.rt,0)) / SUM(vp.net_em_m)) * 12 * 100, 4)
              ELSE 0 END
  FROM view_positivador_agrupado vp
  LEFT JOIN rec r ON r.r_anomes = vp.anomes AND r.r_documento = vp.documento
  WHERE (p_anomes IS NULL OR vp.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR vp.banker = ANY(v_bf))
    AND (p_documento IS NULL OR vp.documento = ANY(p_documento))
    AND (v_af IS NULL OR vp.advisor = ANY(v_af))
    AND (v_ff IS NULL OR vp.finder = ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR vp.tipo_cliente = ANY(p_tipo_cliente))
    AND vp.faixa_pl IS NOT NULL
  GROUP BY vp.anomes, vp.faixa_pl
  ORDER BY vp.anomes;
END;
$function$;

-- Fix rpc_roa_tipo_cliente: "anomes" ambiguous
CREATE OR REPLACE FUNCTION public.rpc_roa_tipo_cliente(
  p_anomes integer[] DEFAULT NULL, p_banker text[] DEFAULT NULL,
  p_documento text[] DEFAULT NULL, p_advisor text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL, p_tipo_cliente text[] DEFAULT NULL
)
RETURNS TABLE(anomes integer, anomes_nome text, tipo_cliente text, roa numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  WITH rec AS (
    SELECT c.anomes AS r_anomes, c.documento AS r_documento, SUM(c.comissao_bruta_tailor) AS rt
    FROM comissoes_consolidado_filtrado c
    WHERE (v_bf IS NULL OR c.banker = ANY(v_bf))
    GROUP BY c.anomes, c.documento
  )
  SELECT vp.anomes,
         to_char(to_date(vp.anomes::text,'YYYYMM'),'Mon/YY'),
         vp.tipo_cliente,
         CASE WHEN SUM(vp.net_em_m) > 0
              THEN ROUND((SUM(COALESCE(r.rt,0)) / SUM(vp.net_em_m)) * 12 * 100, 4)
              ELSE 0 END
  FROM view_positivador_agrupado vp
  LEFT JOIN rec r ON r.r_anomes = vp.anomes AND r.r_documento = vp.documento
  WHERE (p_anomes IS NULL OR vp.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR vp.banker = ANY(v_bf))
    AND (p_documento IS NULL OR vp.documento = ANY(p_documento))
    AND (v_af IS NULL OR vp.advisor = ANY(v_af))
    AND (v_ff IS NULL OR vp.finder = ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR vp.tipo_cliente = ANY(p_tipo_cliente))
  GROUP BY vp.anomes, vp.tipo_cliente
  ORDER BY vp.anomes;
END;
$function$;

-- Fix rpc_roa_m0_tabela: "documento" ambiguous
CREATE OR REPLACE FUNCTION public.rpc_roa_m0_tabela(
  p_anomes integer[] DEFAULT NULL, p_banker text[] DEFAULT NULL,
  p_documento text[] DEFAULT NULL, p_advisor text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL, p_tipo_cliente text[] DEFAULT NULL
)
RETURNS TABLE(documento text, faixa_pl text, roa numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  WITH rec AS (
    SELECT c.anomes AS r_anomes, c.documento AS r_documento, SUM(c.comissao_bruta_tailor) AS rt
    FROM comissoes_consolidado_filtrado c
    WHERE (v_bf IS NULL OR c.banker = ANY(v_bf))
    GROUP BY c.anomes, c.documento
  )
  SELECT vp.documento,
         vp.faixa_pl,
         CASE WHEN SUM(vp.net_em_m) > 0
              THEN ROUND((SUM(COALESCE(r.rt,0)) / SUM(vp.net_em_m)) * 12 * 100, 4)
              ELSE 0 END
  FROM view_positivador_agrupado vp
  LEFT JOIN rec r ON r.r_anomes = vp.anomes AND r.r_documento = vp.documento
  WHERE (p_anomes IS NULL OR vp.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR vp.banker = ANY(v_bf))
    AND (p_documento IS NULL OR vp.documento = ANY(p_documento))
    AND (v_af IS NULL OR vp.advisor = ANY(v_af))
    AND (v_ff IS NULL OR vp.finder = ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR vp.tipo_cliente = ANY(p_tipo_cliente))
    AND vp.faixa_pl IS NOT NULL
  GROUP BY vp.documento, vp.faixa_pl
  ORDER BY 3 DESC;
END;
$function$;

-- Fix rpc_roa_geral: same "anomes" ambiguity pattern
CREATE OR REPLACE FUNCTION public.rpc_roa_geral(
  p_anomes integer[] DEFAULT NULL, p_banker text[] DEFAULT NULL,
  p_documento text[] DEFAULT NULL, p_advisor text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL, p_tipo_cliente text[] DEFAULT NULL
)
RETURNS TABLE(anomes integer, anomes_nome text, roa numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_af text[] := COALESCE(get_user_advisor_filter(), p_advisor);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  WITH rec AS (
    SELECT c.anomes AS r_anomes, c.documento AS r_documento, SUM(c.comissao_bruta_tailor) AS rt
    FROM comissoes_consolidado_filtrado c
    WHERE (v_bf IS NULL OR c.banker = ANY(v_bf))
    GROUP BY c.anomes, c.documento
  )
  SELECT vp.anomes,
         to_char(to_date(vp.anomes::text,'YYYYMM'),'Mon/YY'),
         CASE WHEN SUM(vp.net_em_m) > 0
              THEN ROUND((SUM(COALESCE(r.rt,0)) / SUM(vp.net_em_m)) * 12 * 100, 4)
              ELSE 0 END
  FROM view_positivador_agrupado vp
  LEFT JOIN rec r ON r.r_anomes = vp.anomes AND r.r_documento = vp.documento
  WHERE (p_anomes IS NULL OR vp.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR vp.banker = ANY(v_bf))
    AND (p_documento IS NULL OR vp.documento = ANY(p_documento))
    AND (v_af IS NULL OR vp.advisor = ANY(v_af))
    AND (v_ff IS NULL OR vp.finder = ANY(v_ff))
    AND (p_tipo_cliente IS NULL OR vp.tipo_cliente = ANY(p_tipo_cliente))
  GROUP BY vp.anomes
  ORDER BY vp.anomes;
END;
$function$;
