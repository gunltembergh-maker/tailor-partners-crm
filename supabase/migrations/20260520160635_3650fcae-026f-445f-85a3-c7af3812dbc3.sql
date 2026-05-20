
-- Tabela de feriados nacionais
CREATE TABLE IF NOT EXISTS public.feriados_nacionais (
  data date PRIMARY KEY,
  descricao text NOT NULL,
  tipo text NOT NULL DEFAULT 'nacional',
  criado_em timestamptz DEFAULT now(),
  criado_por uuid
);

COMMENT ON TABLE feriados_nacionais IS 
'Feriados nacionais usados pelo cálculo de dia útil (lógica do 5º dia útil pro email de Receita Caixa).';

ALTER TABLE public.feriados_nacionais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feriados_select_authenticated" ON public.feriados_nacionais;
CREATE POLICY "feriados_select_authenticated"
ON public.feriados_nacionais FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "feriados_admin_insert" ON public.feriados_nacionais;
CREATE POLICY "feriados_admin_insert"
ON public.feriados_nacionais FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'ADMIN'));

DROP POLICY IF EXISTS "feriados_admin_update" ON public.feriados_nacionais;
CREATE POLICY "feriados_admin_update"
ON public.feriados_nacionais FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'ADMIN'));

DROP POLICY IF EXISTS "feriados_admin_delete" ON public.feriados_nacionais;
CREATE POLICY "feriados_admin_delete"
ON public.feriados_nacionais FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'ADMIN'));

-- Popular feriados 2026 e 2027 (datas móveis validadas: Páscoa 2026=05/04, 2027=28/03)
INSERT INTO public.feriados_nacionais (data, descricao) VALUES
('2026-01-01', 'Confraternização Universal'),
('2026-02-16', 'Carnaval (segunda)'),
('2026-02-17', 'Carnaval (terça)'),
('2026-04-03', 'Sexta-feira Santa'),
('2026-04-21', 'Tiradentes'),
('2026-05-01', 'Dia do Trabalho'),
('2026-06-04', 'Corpus Christi'),
('2026-09-07', 'Independência do Brasil'),
('2026-10-12', 'Nossa Senhora Aparecida'),
('2026-11-02', 'Finados'),
('2026-11-15', 'Proclamação da República'),
('2026-12-25', 'Natal'),
('2027-01-01', 'Confraternização Universal'),
('2027-02-08', 'Carnaval (segunda)'),
('2027-02-09', 'Carnaval (terça)'),
('2027-03-26', 'Sexta-feira Santa'),
('2027-04-21', 'Tiradentes'),
('2027-05-01', 'Dia do Trabalho'),
('2027-05-27', 'Corpus Christi'),
('2027-09-07', 'Independência do Brasil'),
('2027-10-12', 'Nossa Senhora Aparecida'),
('2027-11-02', 'Finados'),
('2027-11-15', 'Proclamação da República'),
('2027-12-25', 'Natal')
ON CONFLICT (data) DO NOTHING;

-- 2.1 is_dia_util
CREATE OR REPLACE FUNCTION public.is_dia_util(p_data date)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF EXTRACT(DOW FROM p_data) IN (0, 6) THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM feriados_nacionais WHERE data = p_data) THEN RETURN false; END IF;
  RETURN true;
END;
$$;

-- 2.2 nth_dia_util_do_mes
CREATE OR REPLACE FUNCTION public.nth_dia_util_do_mes(p_ano int, p_mes int, p_n int)
RETURNS date LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_data date;
  v_count int := 0;
  v_max_iter int := 31;
BEGIN
  v_data := make_date(p_ano, p_mes, 1);
  WHILE v_count < p_n AND v_max_iter > 0 LOOP
    IF is_dia_util(v_data) THEN
      v_count := v_count + 1;
    END IF;
    IF v_count = p_n THEN RETURN v_data; END IF;
    v_data := v_data + INTERVAL '1 day';
    v_max_iter := v_max_iter - 1;
  END LOOP;
  RETURN NULL;
END;
$$;

-- 2.3 calcular_mes_referencia_email
CREATE OR REPLACE FUNCTION public.calcular_mes_referencia_email()
RETURNS TABLE(anomes_ref text, mes_int int, ano_int int, em_validacao boolean, dia_util_corrente int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_mes_atual int := EXTRACT(MONTH FROM v_hoje);
  v_ano_atual int := EXTRACT(YEAR FROM v_hoje);
  v_quinto_du date;
  v_dia_util_count int := 0;
  v_data_iter date;
  v_mes_ref int;
  v_ano_ref int;
  v_em_validacao boolean;
BEGIN
  v_quinto_du := nth_dia_util_do_mes(v_ano_atual, v_mes_atual, 5);
  v_data_iter := make_date(v_ano_atual, v_mes_atual, 1);
  WHILE v_data_iter <= v_hoje LOOP
    IF is_dia_util(v_data_iter) THEN
      v_dia_util_count := v_dia_util_count + 1;
    END IF;
    v_data_iter := v_data_iter + INTERVAL '1 day';
  END LOOP;
  IF v_hoje <= v_quinto_du THEN
    v_mes_ref := v_mes_atual - 1;
    v_ano_ref := v_ano_atual;
    IF v_mes_ref = 0 THEN v_mes_ref := 12; v_ano_ref := v_ano_atual - 1; END IF;
    v_em_validacao := true;
  ELSE
    v_mes_ref := v_mes_atual;
    v_ano_ref := v_ano_atual;
    v_em_validacao := false;
  END IF;
  RETURN QUERY SELECT 
    to_char(make_date(v_ano_ref, v_mes_ref, 1), 'YYYY-MM'),
    v_mes_ref, v_ano_ref, v_em_validacao, v_dia_util_count;
END;
$$;

-- PARTE 3: rpc_email_receita_payload
-- IMPORTANTE: anomes é INTEGER (YYYYMM); valor é comissao_bruta_tailor
CREATE OR REPLACE FUNCTION public.rpc_email_receita_payload(
  p_anomes_override text DEFAULT NULL,
  p_em_validacao_override boolean DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.rpc_email_receita_payload(text, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calcular_mes_referencia_email() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_dia_util(date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.nth_dia_util_do_mes(int, int, int) TO authenticated, service_role;
