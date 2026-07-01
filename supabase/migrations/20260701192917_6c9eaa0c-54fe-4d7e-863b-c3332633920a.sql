
CREATE OR REPLACE VIEW public.vw_lavoro_previsto_caixa AS
SELECT
  ramo,
  tipo_de_ramo,
  comissao_bruta AS valor_previsto,
  data_pagamento,
  EXTRACT(YEAR FROM data_pagamento)::int AS ano,
  EXTRACT(MONTH FROM data_pagamento)::int AS mes
FROM public.vw_lavoro_gerencial
WHERE data_pagamento IS NOT NULL
  AND comissao_bruta IS NOT NULL;

GRANT SELECT ON public.vw_lavoro_previsto_caixa TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.rpc_lavoro_receita_kpis(int, int, text);
CREATE OR REPLACE FUNCTION public.rpc_lavoro_receita_kpis(p_ano int, p_mes int, p_periodo text DEFAULT 'YTD')
RETURNS TABLE (
  receita_competencia numeric, receita_caixa numeric,
  meta_periodo numeric, atingimento numeric, defasagem numeric,
  previsto_caixa numeric, atingimento_caixa numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_meta_mensal numeric := public.rpc_lavoro_get_meta_anual(p_ano) / 12;
  v_meta_periodo numeric := CASE WHEN p_periodo = 'YTD' THEN v_meta_mensal * p_mes ELSE v_meta_mensal END;
BEGIN
  RETURN QUERY
  WITH comp AS (
    SELECT SUM(c.comissao_bruta) AS total FROM public.vw_lavoro_receita_competencia c
    WHERE c.ano = p_ano AND ((p_periodo = 'YTD' AND c.mes <= p_mes) OR (p_periodo = 'MTD' AND c.mes = p_mes))
  ),
  caixa AS (
    SELECT SUM(cx.valor) AS total FROM public.vw_lavoro_receita_caixa cx
    WHERE cx.ano = p_ano AND ((p_periodo = 'YTD' AND cx.mes <= p_mes) OR (p_periodo = 'MTD' AND cx.mes = p_mes))
  ),
  previsto AS (
    SELECT SUM(pv.valor_previsto) AS total FROM public.vw_lavoro_previsto_caixa pv
    WHERE pv.ano = p_ano AND ((p_periodo = 'YTD' AND pv.mes <= p_mes) OR (p_periodo = 'MTD' AND pv.mes = p_mes))
  )
  SELECT
    COALESCE(comp.total, 0), COALESCE(caixa.total, 0), v_meta_periodo,
    public.divide_safe(COALESCE(comp.total, 0), v_meta_periodo),
    COALESCE(comp.total, 0) - COALESCE(caixa.total, 0),
    COALESCE(previsto.total, 0),
    public.divide_safe(COALESCE(caixa.total, 0), COALESCE(previsto.total, 0))
  FROM comp, caixa, previsto;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_lavoro_receita_kpis(int, int, text) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.rpc_lavoro_receita_por_canal(int, int);
DROP FUNCTION IF EXISTS public.rpc_lavoro_receita_por_canal(int, int, text);
CREATE OR REPLACE FUNCTION public.rpc_lavoro_receita_por_canal(p_ano int, p_mes int, p_periodo text DEFAULT 'YTD')
RETURNS TABLE (tipo_de_ramo text, receita numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.tipo_de_ramo, SUM(c.comissao_bruta)
  FROM public.vw_lavoro_receita_competencia c
  WHERE c.ano = p_ano
    AND ((p_periodo = 'YTD' AND c.mes <= p_mes) OR (p_periodo = 'MTD' AND c.mes = p_mes))
  GROUP BY c.tipo_de_ramo ORDER BY 2 DESC;
$$;
GRANT EXECUTE ON FUNCTION public.rpc_lavoro_receita_por_canal(int, int, text) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.rpc_lavoro_receita_por_ramo(int, int);
DROP FUNCTION IF EXISTS public.rpc_lavoro_receita_por_ramo(int, int, text);
CREATE OR REPLACE FUNCTION public.rpc_lavoro_receita_por_ramo(p_ano int, p_mes int, p_periodo text DEFAULT 'YTD')
RETURNS TABLE (ramo text, receita numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.ramo, SUM(c.comissao_bruta)
  FROM public.vw_lavoro_receita_competencia c
  WHERE c.ano = p_ano
    AND ((p_periodo = 'YTD' AND c.mes <= p_mes) OR (p_periodo = 'MTD' AND c.mes = p_mes))
  GROUP BY c.ramo ORDER BY 2 DESC;
$$;
GRANT EXECUTE ON FUNCTION public.rpc_lavoro_receita_por_ramo(int, int, text) TO authenticated, service_role;
