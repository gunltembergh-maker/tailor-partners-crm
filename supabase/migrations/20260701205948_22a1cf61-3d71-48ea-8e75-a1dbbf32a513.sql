CREATE OR REPLACE FUNCTION public.rpc_email_receita_lavoro_payload()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ano int := EXTRACT(YEAR FROM now())::int;
  v_mes int := EXTRACT(MONTH FROM now())::int;
  v_mes_kpis record;
  v_ano_kpis record;
  v_meses text[] := ARRAY['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
BEGIN
  PERFORM set_config('statement_timeout', '60s', true);

  SELECT * INTO v_mes_kpis FROM public.rpc_lavoro_receita_kpis(v_ano, v_mes, 'MTD');
  SELECT * INTO v_ano_kpis FROM public.rpc_lavoro_receita_kpis(v_ano, v_mes, 'YTD');

  RETURN jsonb_build_object(
    'ano', v_ano,
    'mes', v_mes,
    'mes_nome', v_meses[v_mes],
    'receita_competencia_mes', COALESCE(v_mes_kpis.receita_competencia, 0),
    'receita_competencia_ano', COALESCE(v_ano_kpis.receita_competencia, 0),
    'receita_caixa_mes', COALESCE(v_mes_kpis.receita_caixa, 0),
    'previsto_caixa_mes', COALESCE(v_mes_kpis.previsto_caixa, 0),
    'atingimento_caixa_mes', v_mes_kpis.atingimento_caixa,
    'gerado_em', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_email_receita_lavoro_payload() TO authenticated, service_role;