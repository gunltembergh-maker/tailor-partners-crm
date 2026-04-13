
CREATE OR REPLACE FUNCTION public.rpc_receita_drilldown(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_categoria text DEFAULT NULL,
  p_subcategoria text DEFAULT NULL,
  p_produto text DEFAULT NULL
)
RETURNS TABLE(
  anomes integer,
  anomes_nome text,
  categoria text,
  subcategoria text,
  produto text,
  documento text,
  valor numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
BEGIN
  RETURN QUERY
  SELECT
    c.anomes,
    to_char(to_date(c.anomes::text,'YYYYMM'),'Mon/YY') AS anomes_nome,
    c.categoria,
    c.subcategoria,
    c.produto,
    c.documento,
    SUM(c.comissao_bruta_tailor) AS valor
  FROM public.mv_comissoes_consolidado_v2 c
  WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR c.banker = ANY(v_bf))
    AND (p_finder IS NULL OR c.finder = ANY(p_finder))
    AND (p_categoria IS NULL OR c.categoria = p_categoria)
    AND (p_subcategoria IS NULL OR c.subcategoria = p_subcategoria)
    AND (p_produto IS NULL OR c.produto = p_produto)
    AND NOT (
      c.categoria = 'Lavoro'
      AND COALESCE(c.banker, '') IN ('Sem Advisor', '')
      AND COALESCE(c.finder, '') IN ('Sem Finder', '', 'Priscilla Macedo')
    )
  GROUP BY c.anomes, c.categoria, c.subcategoria, c.produto, c.documento
  ORDER BY c.anomes;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.rpc_receita_drilldown(integer[], text[], text[], text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_receita_drilldown(integer[], text[], text[], text, text, text) TO service_role;
