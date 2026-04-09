
-- Drop function with changed return type first
DROP FUNCTION IF EXISTS public.rpc_receita_matriz_rows(int[],text[],text[]);

-- 1. rpc_receita_total
CREATE OR REPLACE FUNCTION public.rpc_receita_total(
  p_anomes int[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL
)
RETURNS TABLE(receita numeric)
LANGUAGE plpgsql SECURITY DEFINER
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
      AND COALESCE(banker, '') IN ('Sem Advisor', '')
      AND COALESCE(finder, '') IN ('Sem Finder', '', 'Priscilla Macedo')
    );
END;
$func$;

-- 2. rpc_receita_mes_categoria
CREATE OR REPLACE FUNCTION public.rpc_receita_mes_categoria(
  p_anomes int[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL
)
RETURNS TABLE(anomes int, anomes_nome text, categoria text, valor numeric)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT c.anomes,
         to_char(to_date(c.anomes::text,'YYYYMM'),'Mon/YY') AS anomes_nome,
         c.categoria,
         SUM(c.comissao_bruta_tailor) AS valor
  FROM public.mv_comissoes_consolidado_v2 c
  WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR c.banker = ANY(v_bf))
    AND (v_ff IS NULL OR c.finder = ANY(v_ff))
    AND NOT (
      c.categoria = 'Lavoro'
      AND COALESCE(c.banker, '') IN ('Sem Advisor', '')
      AND COALESCE(c.finder, '') IN ('Sem Finder', '', 'Priscilla Macedo')
    )
  GROUP BY c.anomes, c.categoria
  ORDER BY c.anomes;
END;
$func$;

-- 3. rpc_receita_treemap_categoria
CREATE OR REPLACE FUNCTION public.rpc_receita_treemap_categoria(
  p_anomes int[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL
)
RETURNS TABLE(categoria text, valor numeric)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT c.categoria, SUM(c.comissao_bruta_tailor) AS valor
  FROM public.mv_comissoes_consolidado_v2 c
  WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR c.banker = ANY(v_bf))
    AND (v_ff IS NULL OR c.finder = ANY(v_ff))
    AND NOT (
      c.categoria = 'Lavoro'
      AND COALESCE(c.banker, '') IN ('Sem Advisor', '')
      AND COALESCE(c.finder, '') IN ('Sem Finder', '', 'Priscilla Macedo')
    )
  GROUP BY c.categoria
  ORDER BY valor DESC;
END;
$func$;

-- 4. rpc_receita_matriz_rows (recreate with correct return type)
CREATE FUNCTION public.rpc_receita_matriz_rows(
  p_anomes int[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL
)
RETURNS TABLE(anomes int, anomes_nome text, categoria text, subcategoria text, produto text, valor numeric)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT c.anomes,
         to_char(to_date(c.anomes::text,'YYYYMM'),'Mon/YY') AS anomes_nome,
         c.categoria, c.subcategoria, c.produto,
         SUM(c.comissao_bruta_tailor) AS valor
  FROM public.mv_comissoes_consolidado_v2 c
  WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR c.banker = ANY(v_bf))
    AND (v_ff IS NULL OR c.finder = ANY(v_ff))
    AND NOT (
      c.categoria = 'Lavoro'
      AND COALESCE(c.banker, '') IN ('Sem Advisor', '')
      AND COALESCE(c.finder, '') IN ('Sem Finder', '', 'Priscilla Macedo')
    )
  GROUP BY c.anomes, c.categoria, c.subcategoria, c.produto
  ORDER BY c.anomes;
END;
$func$;

-- 5. rpc_receita_matriz_rows_cat
CREATE OR REPLACE FUNCTION public.rpc_receita_matriz_rows_cat(
  p_anomes int[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL
)
RETURNS TABLE(anomes int, anomes_nome text, categoria text, valor numeric)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
  v_ff text[] := COALESCE(get_user_finder_filter(), p_finder);
BEGIN
  RETURN QUERY
  SELECT c.anomes,
         to_char(to_date(c.anomes::text,'YYYYMM'),'Mon/YY') AS anomes_nome,
         c.categoria,
         SUM(c.comissao_bruta_tailor) AS valor
  FROM public.mv_comissoes_consolidado_v2 c
  WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR c.banker = ANY(v_bf))
    AND (v_ff IS NULL OR c.finder = ANY(v_ff))
    AND NOT (
      c.categoria = 'Lavoro'
      AND COALESCE(c.banker, '') IN ('Sem Advisor', '')
      AND COALESCE(c.finder, '') IN ('Sem Finder', '', 'Priscilla Macedo')
    )
  GROUP BY c.anomes, c.categoria
  ORDER BY c.anomes;
END;
$func$;

-- 6. rpc_receita_drilldown
CREATE OR REPLACE FUNCTION public.rpc_receita_drilldown(
  p_anomes int[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_categoria text DEFAULT NULL,
  p_subcategoria text DEFAULT NULL,
  p_produto text DEFAULT NULL
)
RETURNS TABLE(label text, valor numeric)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN p_produto IS NOT NULL THEN c.documento
      WHEN p_subcategoria IS NOT NULL THEN c.produto
      WHEN p_categoria IS NOT NULL THEN c.subcategoria
      ELSE c.categoria
    END AS label,
    SUM(c.comissao_bruta_tailor) AS valor
  FROM public.mv_comissoes_consolidado_v2 c
  WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR c.banker = ANY(v_bf))
    AND (p_categoria IS NULL OR c.categoria = p_categoria)
    AND (p_subcategoria IS NULL OR c.subcategoria = p_subcategoria)
    AND (p_produto IS NULL OR c.produto = p_produto)
    AND NOT (
      c.categoria = 'Lavoro'
      AND COALESCE(c.banker, '') IN ('Sem Advisor', '')
      AND COALESCE(c.finder, '') IN ('Sem Finder', '', 'Priscilla Macedo')
    )
  GROUP BY label
  ORDER BY valor DESC;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.rpc_receita_total(int[],text[],text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_receita_mes_categoria(int[],text[],text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_receita_treemap_categoria(int[],text[],text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_receita_matriz_rows(int[],text[],text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_receita_matriz_rows_cat(int[],text[],text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_receita_drilldown(int[],text[],text,text,text) TO authenticated;
