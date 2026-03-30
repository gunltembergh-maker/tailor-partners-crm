
DROP FUNCTION IF EXISTS public.rpc_receita_drilldown(integer[], text[], text, text, text);

CREATE OR REPLACE FUNCTION public.rpc_receita_drilldown(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_categoria text DEFAULT NULL,
  p_subcategoria text DEFAULT NULL,
  p_produto text DEFAULT NULL
)
RETURNS TABLE(anomes integer, anomes_nome text, categoria text, produto text, subcategoria text, subproduto text, documento text, valor numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
BEGIN
  IF p_categoria IS NOT NULL AND p_subcategoria IS NOT NULL AND p_produto IS NOT NULL THEN
    RETURN QUERY
    SELECT c.anomes, to_char(to_date(c.anomes::text,'YYYYMM'),'Mon/YY'),
      c.categoria, c.produto, c.subcategoria, c.subproduto, c.documento,
      SUM(c.comissao_bruta_tailor)
    FROM mv_comissoes_consolidado c
    WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
      AND (v_bf IS NULL OR c.banker = ANY(v_bf))
      AND c.categoria = p_categoria
      AND c.subcategoria = p_subcategoria
      AND c.produto = p_produto
    GROUP BY 1,2,3,4,5,6,7 ORDER BY 1,3,4,5,6,7;
  ELSE
    RETURN QUERY
    SELECT c.anomes, to_char(to_date(c.anomes::text,'YYYYMM'),'Mon/YY'),
      c.categoria, c.produto, c.subcategoria, c.subproduto, NULL::text as documento,
      SUM(c.comissao_bruta_tailor)
    FROM mv_comissoes_consolidado c
    WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
      AND (v_bf IS NULL OR c.banker = ANY(v_bf))
      AND (p_categoria IS NULL OR c.categoria = p_categoria)
      AND (p_subcategoria IS NULL OR c.subcategoria = p_subcategoria)
      AND (p_produto IS NULL OR c.produto = p_produto)
    GROUP BY 1,2,3,4,5,6 ORDER BY 1,3,4,5,6;
  END IF;
END;
$$;
