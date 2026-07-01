CREATE OR REPLACE FUNCTION public.rpc_lavoro_comissao_vencida_por_canal(p_ano int, p_mes int, p_periodo text DEFAULT 'YTD')
RETURNS TABLE (tipo_de_ramo text, comissao_vencida numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(TRIM(g.tipo_de_ramo), ''), 'Sem Canal') AS tipo_de_ramo,
         SUM(g.comissao_bruta)::numeric AS comissao_vencida
  FROM public.vw_lavoro_gerencial g
  WHERE g.status_parcela_comissao ILIKE '%vencid%'
    AND g.ano = p_ano
    AND (
      (p_periodo = 'MTD' AND g.mes = p_mes) OR
      (p_periodo = 'YTD' AND g.mes <= p_mes) OR
      (p_periodo = 'SEMESTRE' AND g.mes BETWEEN (CASE WHEN p_mes <= 6 THEN 1 ELSE 7 END) AND p_mes)
    )
  GROUP BY 1
  ORDER BY 2 DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_lavoro_comissao_vencida_por_canal(int, int, text) TO authenticated, service_role;