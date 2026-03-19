
CREATE OR REPLACE FUNCTION public.rpc_receita_matriz_rows_cat(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL
) RETURNS TABLE(categoria text, anomes integer, anomes_nome text, valor numeric)
LANGUAGE sql STABLE AS $$
  SELECT
    categoria,
    anomes,
    to_char(to_date(anomes::text,'YYYYMM'),'Mon/YY') AS anomes_nome,
    SUM(COALESCE(comissao_bruta_tailor, 0)) AS valor
  FROM comissoes_consolidado_filtrado
  WHERE (p_anomes IS NULL OR anomes = ANY(p_anomes))
    AND (p_banker IS NULL OR banker = ANY(p_banker))
  GROUP BY categoria, anomes
  ORDER BY categoria, anomes DESC;
$$;
