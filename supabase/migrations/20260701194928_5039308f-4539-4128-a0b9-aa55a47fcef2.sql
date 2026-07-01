
-- 5.1 KPIs with SEMESTRE support
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
  v_semestre int := CASE WHEN p_mes <= 6 THEN 1 ELSE 2 END;
  v_mes_inicio_semestre int := CASE WHEN v_semestre = 1 THEN 1 ELSE 7 END;
  v_meses_no_periodo int := CASE
    WHEN p_periodo = 'MTD' THEN 1
    WHEN p_periodo = 'SEMESTRE' THEN (p_mes - v_mes_inicio_semestre + 1)
    ELSE p_mes
  END;
  v_meta_periodo numeric := v_meta_mensal * v_meses_no_periodo;
BEGIN
  RETURN QUERY
  WITH comp AS (
    SELECT SUM(c.comissao_bruta) AS total FROM public.vw_lavoro_receita_competencia c
    WHERE c.ano = p_ano AND (
      (p_periodo = 'MTD' AND c.mes = p_mes) OR
      (p_periodo = 'YTD' AND c.mes <= p_mes) OR
      (p_periodo = 'SEMESTRE' AND c.mes BETWEEN v_mes_inicio_semestre AND p_mes)
    )
  ),
  caixa AS (
    SELECT SUM(cx.valor) AS total FROM public.vw_lavoro_receita_caixa cx
    WHERE cx.ano = p_ano AND (
      (p_periodo = 'MTD' AND cx.mes = p_mes) OR
      (p_periodo = 'YTD' AND cx.mes <= p_mes) OR
      (p_periodo = 'SEMESTRE' AND cx.mes BETWEEN v_mes_inicio_semestre AND p_mes)
    )
  ),
  previsto AS (
    SELECT SUM(pv.valor_previsto) AS total FROM public.vw_lavoro_previsto_caixa pv
    WHERE pv.ano = p_ano AND (
      (p_periodo = 'MTD' AND pv.mes = p_mes) OR
      (p_periodo = 'YTD' AND pv.mes <= p_mes) OR
      (p_periodo = 'SEMESTRE' AND pv.mes BETWEEN v_mes_inicio_semestre AND p_mes)
    )
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

-- Canal com SEMESTRE
CREATE OR REPLACE FUNCTION public.rpc_lavoro_receita_por_canal(p_ano integer, p_mes integer, p_periodo text DEFAULT 'YTD')
RETURNS TABLE(tipo_de_ramo text, receita numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH cfg AS (
    SELECT CASE WHEN p_mes <= 6 THEN 1 ELSE 7 END AS mes_ini
  )
  SELECT c.tipo_de_ramo, SUM(c.comissao_bruta)
  FROM public.vw_lavoro_receita_competencia c, cfg
  WHERE c.ano = p_ano
    AND (
      (p_periodo = 'YTD' AND c.mes <= p_mes) OR
      (p_periodo = 'MTD' AND c.mes = p_mes) OR
      (p_periodo = 'SEMESTRE' AND c.mes BETWEEN cfg.mes_ini AND p_mes)
    )
  GROUP BY c.tipo_de_ramo ORDER BY 2 DESC;
$$;

-- Ramo com SEMESTRE
CREATE OR REPLACE FUNCTION public.rpc_lavoro_receita_por_ramo(p_ano integer, p_mes integer, p_periodo text DEFAULT 'YTD')
RETURNS TABLE(ramo text, receita numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH cfg AS (
    SELECT CASE WHEN p_mes <= 6 THEN 1 ELSE 7 END AS mes_ini
  )
  SELECT c.ramo, SUM(c.comissao_bruta)
  FROM public.vw_lavoro_receita_competencia c, cfg
  WHERE c.ano = p_ano
    AND (
      (p_periodo = 'YTD' AND c.mes <= p_mes) OR
      (p_periodo = 'MTD' AND c.mes = p_mes) OR
      (p_periodo = 'SEMESTRE' AND c.mes BETWEEN cfg.mes_ini AND p_mes)
    )
  GROUP BY c.ramo ORDER BY 2 DESC;
$$;

-- 5.2 Comparativo YoY de Caixa
CREATE OR REPLACE FUNCTION public.rpc_lavoro_receita_caixa_comparativo_anual(p_anos int[])
RETURNS TABLE (ano int, mes int, receita_caixa numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT cx.ano, cx.mes, SUM(cx.valor)
  FROM public.vw_lavoro_receita_caixa cx
  WHERE cx.ano = ANY(p_anos)
  GROUP BY cx.ano, cx.mes ORDER BY cx.ano, cx.mes;
$$;

-- 5.3 Variações
CREATE OR REPLACE FUNCTION public.rpc_lavoro_receita_variacoes(p_ano int, p_mes int)
RETURNS TABLE (variacao_mes_anterior numeric, variacao_ano_anterior numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_atual numeric;
  v_mes_anterior numeric;
  v_ano_anterior numeric;
  v_ano_ref int := CASE WHEN p_mes = 1 THEN p_ano - 1 ELSE p_ano END;
  v_mes_ref int := CASE WHEN p_mes = 1 THEN 12 ELSE p_mes - 1 END;
BEGIN
  SELECT SUM(valor) INTO v_atual FROM public.vw_lavoro_receita_caixa WHERE ano = p_ano AND mes = p_mes;
  SELECT SUM(valor) INTO v_mes_anterior FROM public.vw_lavoro_receita_caixa WHERE ano = v_ano_ref AND mes = v_mes_ref;
  SELECT SUM(valor) INTO v_ano_anterior FROM public.vw_lavoro_receita_caixa WHERE ano = p_ano - 1 AND mes = p_mes;

  RETURN QUERY SELECT
    public.divide_safe(COALESCE(v_atual,0) - COALESCE(v_mes_anterior,0), NULLIF(v_mes_anterior,0)),
    public.divide_safe(COALESCE(v_atual,0) - COALESCE(v_ano_anterior,0), NULLIF(v_ano_anterior,0));
END;
$$;
