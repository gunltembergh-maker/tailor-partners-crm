CREATE OR REPLACE FUNCTION public.rpc_email_receita_payload(p_anomes_override text DEFAULT NULL::text, p_em_validacao_override boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_anomes_ref text;
  v_em_validacao boolean;
  v_mes_int int;
  v_ano_int int;
  v_anomes_int int;
  v_anomes_prev_int int;
  v_anomes_yoy_int int;
  v_anomes_inicio_12m_int int;
  v_data_ref date;
  v_meses_nomes text[] := ARRAY['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  v_meses_abrev text[] := ARRAY['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  v_receita_mes numeric;
  v_receita_mes_anterior numeric;
  v_receita_yoy numeric;
  v_receita_12_meses numeric;
  v_var_mom numeric;
  v_var_yoy numeric;
  v_categorias jsonb;
  v_serie_12_meses jsonb;
  v_payload jsonb;
  r record;
BEGIN
  -- NOVO: statement_timeout LOCAL à transação (folga 7-8x sobre tempo esperado warm)
  PERFORM set_config('statement_timeout', '60s', true);

  -- Resolve mês de referência
  IF p_anomes_override IS NOT NULL THEN
    v_anomes_ref := p_anomes_override;
    v_ano_int := SUBSTRING(v_anomes_ref, 1, 4)::int;
    v_mes_int := SUBSTRING(v_anomes_ref, 6, 2)::int;
    v_em_validacao := COALESCE(p_em_validacao_override, false);
  ELSE
    SELECT c.anomes_ref, c.mes_int, c.ano_int, c.em_validacao
      INTO v_anomes_ref, v_mes_int, v_ano_int, v_em_validacao
    FROM calcular_mes_referencia_email() c;
    IF p_em_validacao_override IS NOT NULL THEN v_em_validacao := p_em_validacao_override; END IF;
  END IF;

  v_data_ref := make_date(v_ano_int, v_mes_int, 1);
  v_anomes_int := v_ano_int * 100 + v_mes_int;
  v_anomes_prev_int := EXTRACT(YEAR FROM (v_data_ref - INTERVAL '1 month'))::int * 100
                     + EXTRACT(MONTH FROM (v_data_ref - INTERVAL '1 month'))::int;
  v_anomes_yoy_int := EXTRACT(YEAR FROM (v_data_ref - INTERVAL '12 months'))::int * 100
                    + EXTRACT(MONTH FROM (v_data_ref - INTERVAL '12 months'))::int;
  v_anomes_inicio_12m_int := EXTRACT(YEAR FROM (v_data_ref - INTERVAL '11 months'))::int * 100
                           + EXTRACT(MONTH FROM (v_data_ref - INTERVAL '11 months'))::int;

  SELECT COALESCE(SUM(comissao_bruta_tailor), 0) INTO v_receita_mes
    FROM mv_comissoes_caixa_completa WHERE anomes = v_anomes_int;
  SELECT COALESCE(SUM(comissao_bruta_tailor), 0) INTO v_receita_mes_anterior
    FROM mv_comissoes_caixa_completa WHERE anomes = v_anomes_prev_int;
  SELECT COALESCE(SUM(comissao_bruta_tailor), 0) INTO v_receita_yoy
    FROM mv_comissoes_caixa_completa WHERE anomes = v_anomes_yoy_int;

  v_var_mom := CASE WHEN v_receita_mes_anterior > 0
    THEN ROUND(((v_receita_mes - v_receita_mes_anterior) / v_receita_mes_anterior * 100)::numeric, 1)
    ELSE NULL END;
  v_var_yoy := CASE WHEN v_receita_yoy > 0
    THEN ROUND(((v_receita_mes - v_receita_yoy) / v_receita_yoy * 100)::numeric, 1)
    ELSE NULL END;

  SELECT jsonb_agg(
    jsonb_build_object(
      'categoria', COALESCE(categoria, 'Sem categoria'),
      'valor', total,
      'percentual', ROUND((total / NULLIF(v_receita_mes, 0) * 100)::numeric, 1)
    ) ORDER BY total DESC
  ) INTO v_categorias
  FROM (
    SELECT categoria, SUM(comissao_bruta_tailor) AS total
    FROM mv_comissoes_caixa_completa
    WHERE anomes = v_anomes_int
    GROUP BY categoria
    HAVING SUM(comissao_bruta_tailor) <> 0
    ORDER BY total DESC
  ) cat;

  SELECT jsonb_agg(
    jsonb_build_object(
      'anomes', anomes_str,
      'mes_label', mes_label,
      'receita', receita
    ) ORDER BY anomes_sort ASC
  ) INTO v_serie_12_meses
  FROM (
    SELECT 
      anomes AS anomes_sort,
      to_char(make_date(anomes/100, anomes%100, 1), 'YYYY-MM') AS anomes_str,
      v_meses_abrev[anomes%100] || '/' || RIGHT((anomes/100)::text, 2) AS mes_label,
      COALESCE(SUM(comissao_bruta_tailor), 0) AS receita
    FROM mv_comissoes_caixa_completa
    WHERE anomes >= v_anomes_inicio_12m_int AND anomes <= v_anomes_int
    GROUP BY anomes
    ORDER BY anomes
  ) serie;

  SELECT COALESCE(SUM(comissao_bruta_tailor), 0) INTO v_receita_12_meses
    FROM mv_comissoes_caixa_completa
    WHERE anomes >= v_anomes_inicio_12m_int AND anomes <= v_anomes_int;

  v_payload := jsonb_build_object(
    'mes_referencia', jsonb_build_object(
      'anomes', v_anomes_ref,
      'mes_int', v_mes_int,
      'ano_int', v_ano_int,
      'mes_nome', v_meses_nomes[v_mes_int],
      'em_validacao', v_em_validacao
    ),
    'receita_mes', jsonb_build_object(
      'valor', v_receita_mes,
      'mom_pct', v_var_mom,
      'yoy_pct', v_var_yoy,
      'valor_mes_anterior', v_receita_mes_anterior,
      'valor_mesmo_mes_ano_anterior', v_receita_yoy
    ),
    'categorias', COALESCE(v_categorias, '[]'::jsonb),
    'serie_12_meses', COALESCE(v_serie_12_meses, '[]'::jsonb),
    'receita_acumulada_12_meses', v_receita_12_meses,
    'gerado_em', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
  );

  RETURN v_payload;
END;
$function$;