
-- 1. Register receita_lavoro schedule (trigger cria cron job automaticamente)
INSERT INTO public.email_schedules_config (modulo, hora_brt, dias_semana, ativo)
VALUES ('receita_lavoro', '08:35:00', ARRAY[1,2,3,4,5], true)
ON CONFLICT (modulo) DO NOTHING;

-- 2. RPC payload para newsletter Receita Lavoro
CREATE OR REPLACE FUNCTION public.rpc_email_receita_lavoro_payload()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ano int := EXTRACT(YEAR FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::int;
  v_mes int := EXTRACT(MONTH FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::int;
  v_mes_kpis record;
  v_semestre_kpis record;
  v_ano_kpis record;
  v_variacoes record;
  v_meses text[] := ARRAY['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
BEGIN
  PERFORM set_config('statement_timeout', '60s', true);

  SELECT * INTO v_mes_kpis FROM public.rpc_lavoro_receita_kpis(v_ano, v_mes, 'MTD');
  SELECT * INTO v_semestre_kpis FROM public.rpc_lavoro_receita_kpis(v_ano, v_mes, 'SEMESTRE');
  SELECT * INTO v_ano_kpis FROM public.rpc_lavoro_receita_kpis(v_ano, v_mes, 'YTD');
  SELECT * INTO v_variacoes FROM public.rpc_lavoro_receita_variacoes(v_ano, v_mes);

  RETURN jsonb_build_object(
    'ano', v_ano,
    'mes', v_mes,
    'mes_nome', v_meses[v_mes],
    'semestre_label', CASE WHEN v_mes <= 6 THEN 'S1' ELSE 'S2' END,
    'mes_bloco', to_jsonb(v_mes_kpis),
    'semestre_bloco', to_jsonb(v_semestre_kpis),
    'ano_bloco', to_jsonb(v_ano_kpis),
    'variacao_mes_anterior', v_variacoes.variacao_mes_anterior,
    'variacao_ano_anterior', v_variacoes.variacao_ano_anterior,
    'gerado_em', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD"T"HH24:MI:SS')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_email_receita_lavoro_payload() TO authenticated, service_role;
