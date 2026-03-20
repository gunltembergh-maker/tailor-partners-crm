CREATE OR REPLACE FUNCTION public.rpc_receita_drilldown(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_categoria text DEFAULT NULL,
  p_subcategoria text DEFAULT NULL,
  p_produto text DEFAULT NULL
) RETURNS TABLE(label text, anomes integer, anomes_nome text, valor numeric)
LANGUAGE sql STABLE AS $$
  SELECT
    CASE
      WHEN p_produto IS NOT NULL THEN documento
      WHEN p_subcategoria IS NOT NULL THEN produto
      WHEN p_categoria IS NOT NULL THEN subcategoria
      ELSE categoria
    END AS label,
    cf.anomes,
    to_char(to_date(cf.anomes::text,'YYYYMM'),'Mon/YY') AS anomes_nome,
    SUM(COALESCE(comissao_bruta_tailor, 0)) AS valor
  FROM comissoes_consolidado_filtrado cf
  WHERE (p_anomes IS NULL OR cf.anomes = ANY(p_anomes))
    AND (p_banker IS NULL OR banker = ANY(p_banker))
    AND (p_categoria IS NULL OR categoria = p_categoria)
    AND (p_subcategoria IS NULL OR subcategoria = p_subcategoria)
    AND (p_produto IS NULL OR produto = p_produto)
  GROUP BY 1, cf.anomes
  ORDER BY 1, cf.anomes DESC;
$$;