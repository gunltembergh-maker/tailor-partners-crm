
-- Drop and recreate all 5 revenue RPCs with p_finder parameter

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
  FROM mv_comissoes_consolidado
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
  SELECT c.anomes, to_char(to_date(c.anomes::text,'YYYYMM'),'Mon/YY'),
    c.categoria, SUM(c.comissao_bruta_tailor)
  FROM mv_comissoes_consolidado c
  WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR c.banker = ANY(v_bf))
    AND (v_ff IS NULL OR c.finder = ANY(v_ff))
    AND c.categoria IS NOT NULL
  GROUP BY 1,2,3 ORDER BY 1,3;
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
  FROM mv_comissoes_consolidado c
  WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR c.banker = ANY(v_bf))
    AND (v_ff IS NULL OR c.finder = ANY(v_ff))
    AND c.categoria IS NOT NULL
  GROUP BY 1 ORDER BY 2 DESC;
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
  SELECT c.anomes, to_char(to_date(c.anomes::text,'YYYYMM'),'Mon/YY'),
    c.categoria, c.produto, c.subcategoria, c.subproduto,
    SUM(c.comissao_bruta_tailor)
  FROM mv_comissoes_consolidado c
  WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR c.banker = ANY(v_bf))
    AND (v_ff IS NULL OR c.finder = ANY(v_ff))
  GROUP BY 1,2,3,4,5,6 ORDER BY 1,3,4,5,6;
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
  SELECT c.anomes, to_char(to_date(c.anomes::text,'YYYYMM'),'Mon/YY'),
    c.categoria, SUM(c.comissao_bruta_tailor)
  FROM mv_comissoes_consolidado c
  WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR c.banker = ANY(v_bf))
    AND (v_ff IS NULL OR c.finder = ANY(v_ff))
    AND c.categoria IS NOT NULL
  GROUP BY 1,2,3 ORDER BY 1,3;
END;
$function$;
