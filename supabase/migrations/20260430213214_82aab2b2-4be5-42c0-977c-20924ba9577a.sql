-- Aggregated drilldown RPC: groups only by the requested drill level + month,
-- avoiding the PostgREST 1000-row response cap on heavy categories like Assessoria.
CREATE OR REPLACE FUNCTION public.rpc_receita_drilldown_agg(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_categoria text DEFAULT NULL,
  p_subcategoria text DEFAULT NULL,
  p_produto text DEFAULT NULL,
  p_level integer DEFAULT 1  -- 1=subcategoria, 2=produto, 3=documento (cliente)
)
RETURNS TABLE(
  anomes integer,
  anomes_nome text,
  label text,
  valor numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bf text[] := COALESCE(get_user_banker_filter(), p_banker);
BEGIN
  RETURN QUERY
  SELECT c.anomes,
         to_char(to_date(c.anomes::text,'YYYYMM'),'Mon/YY') AS anomes_nome,
         CASE p_level
           WHEN 1 THEN COALESCE(c.subcategoria, 'N/D')
           WHEN 2 THEN COALESCE(c.produto, 'N/D')
           WHEN 3 THEN COALESCE(c.documento, 'N/D')
           ELSE COALESCE(c.categoria, 'N/D')
         END AS label,
         SUM(c.comissao_bruta_tailor)::numeric AS valor
  FROM public.mv_comissoes_consolidado_v2 c
  WHERE (p_anomes IS NULL OR c.anomes = ANY(p_anomes))
    AND (v_bf IS NULL OR c.banker = ANY(v_bf))
    AND (p_finder IS NULL OR c.finder = ANY(p_finder))
    AND (p_categoria IS NULL OR c.categoria = p_categoria)
    AND (p_subcategoria IS NULL OR c.subcategoria = p_subcategoria)
    AND (p_produto IS NULL OR c.produto = p_produto)
    AND NOT (
      c.categoria = 'Lavoro'
      AND COALESCE(c.banker, '') IN ('Sem Advisor', 'Sem Assessor', '')
      AND COALESCE(c.finder, '') IN ('Sem Finder', '', 'Priscilla Macedo')
    )
  GROUP BY c.anomes, 1,
    CASE p_level
      WHEN 1 THEN COALESCE(c.subcategoria, 'N/D')
      WHEN 2 THEN COALESCE(c.produto, 'N/D')
      WHEN 3 THEN COALESCE(c.documento, 'N/D')
      ELSE COALESCE(c.categoria, 'N/D')
    END
  ORDER BY c.anomes;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_receita_drilldown_agg(integer[], text[], text[], text, text, text, integer) TO authenticated, anon;