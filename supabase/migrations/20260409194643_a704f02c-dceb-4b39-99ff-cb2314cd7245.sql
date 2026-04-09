
-- Exclusion filter for Lavoro records without proper advisor/finder

CREATE OR REPLACE FUNCTION public.rpc_receita_total(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL
)
RETURNS TABLE(receita numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT COALESCE(SUM(comissao_bruta_tailor), 0)
  FROM public.mv_comissoes_consolidado_v2
  WHERE (p_anomes IS NULL OR anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR banker = ANY(v_bf))
    AND (v_ff IS NULL OR finder = ANY(v_ff))
    AND NOT (
      categoria = 'Lavoro'
      AND COALESCE(advisor, '') IN ('Sem Advisor', '')
      AND COALESCE(finder, '') IN ('Sem Finder', '', 'Priscilla Macedo')
    );
END;
$func$;

CREATE OR REPLACE FUNCTION public.rpc_receita_mes_categoria(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL
)
RETURNS TABLE(anomes integer, anomes_nome text, categoria text, valor numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $func$
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
    AND NOT (
      c.categoria = 'Lavoro'
      AND COALESCE(c.advisor, '') IN ('Sem Advisor', '')
      AND COALESCE(c.finder, '') IN ('Sem Finder', '', 'Priscilla Macedo')
    )
  GROUP BY 1, 2, 3
  ORDER BY 1, 3;
END;
$func$;

CREATE OR REPLACE FUNCTION public.rpc_receita_treemap_categoria(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL
)
RETURNS TABLE(categoria text, valor numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $func$
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
    AND NOT (
      c.categoria = 'Lavoro'
      AND COALESCE(c.advisor, '') IN ('Sem Advisor', '')
      AND COALESCE(c.finder, '') IN ('Sem Finder', '', 'Priscilla Macedo')
    )
  GROUP BY 1
  ORDER BY 2 DESC;
END;
$func$;

CREATE OR REPLACE FUNCTION public.rpc_receita_matriz_rows_cat(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL
)
RETURNS TABLE(anomes integer, anomes_nome text, categoria text, valor numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $func$
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
    AND NOT (
      c.categoria = 'Lavoro'
      AND COALESCE(c.advisor, '') IN ('Sem Advisor', '')
      AND COALESCE(c.finder, '') IN ('Sem Finder', '', 'Priscilla Macedo')
    )
  GROUP BY 1, 2, 3
  ORDER BY 1, 3;
END;
$func$;

CREATE OR REPLACE FUNCTION public.rpc_receita_matriz_rows(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL
)
RETURNS TABLE(anomes integer, anomes_nome text, categoria text, produto text, subcategoria text, subproduto text, valor numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $func$
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
    AND NOT (
      c.categoria = 'Lavoro'
      AND COALESCE(c.advisor, '') IN ('Sem Advisor', '')
      AND COALESCE(c.finder, '') IN ('Sem Finder', '', 'Priscilla Macedo')
    )
  GROUP BY 1, 2, 3, 4, 5, 6
  ORDER BY 1, 3, 4, 5, 6;
END;
$func$;

CREATE OR REPLACE FUNCTION public.rpc_receita_drilldown(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_categoria text DEFAULT NULL,
  p_subcategoria text DEFAULT NULL,
  p_produto text DEFAULT NULL,
  p_finder text[] DEFAULT NULL
)
RETURNS TABLE(anomes integer, anomes_nome text, categoria text, produto text, subcategoria text, subproduto text, documento text, valor numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $func$
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
      AND NOT (
        c.categoria = 'Lavoro'
        AND COALESCE(c.advisor, '') IN ('Sem Advisor', '')
        AND COALESCE(c.finder, '') IN ('Sem Finder', '', 'Priscilla Macedo')
      )
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
      AND NOT (
        c.categoria = 'Lavoro'
        AND COALESCE(c.advisor, '') IN ('Sem Advisor', '')
        AND COALESCE(c.finder, '') IN ('Sem Finder', '', 'Priscilla Macedo')
      )
    GROUP BY 1,2,3,4,5,6
    ORDER BY 1,3,4,5,6;
  END IF;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.rpc_receita_total(integer[], text[], text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_receita_mes_categoria(integer[], text[], text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_receita_treemap_categoria(integer[], text[], text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_receita_matriz_rows_cat(integer[], text[], text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_receita_matriz_rows(integer[], text[], text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_receita_drilldown(integer[], text[], text, text, text, text[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
