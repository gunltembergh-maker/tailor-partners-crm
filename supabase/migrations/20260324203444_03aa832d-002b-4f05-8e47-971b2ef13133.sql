
-- 1. Enable RLS on perfis_acesso and add policies
ALTER TABLE public.perfis_acesso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read perfis_acesso"
  ON public.perfis_acesso FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage perfis_acesso"
  ON public.perfis_acesso FOR ALL
  TO authenticated
  USING (public.is_admin_or_lider(auth.uid()))
  WITH CHECK (public.is_admin_or_lider(auth.uid()));

-- 2. Drop all anon insert/delete policies on raw_* tables and sync_logs
DROP POLICY "Anon can delete raw_base_avenue" ON public.raw_base_avenue;
DROP POLICY "Anon can insert raw_base_avenue" ON public.raw_base_avenue;
DROP POLICY "Anon can delete raw_base_cambio" ON public.raw_base_cambio;
DROP POLICY "Anon can insert raw_base_cambio" ON public.raw_base_cambio;
DROP POLICY "Anon can delete raw_base_consolidada" ON public.raw_base_consolidada;
DROP POLICY "Anon can insert raw_base_consolidada" ON public.raw_base_consolidada;
DROP POLICY "Anon can delete raw_base_corp_seguros" ON public.raw_base_corp_seguros;
DROP POLICY "Anon can insert raw_base_corp_seguros" ON public.raw_base_corp_seguros;
DROP POLICY "Anon can delete raw_base_crm" ON public.raw_base_crm;
DROP POLICY "Anon can insert raw_base_crm" ON public.raw_base_crm;
DROP POLICY "Anon can delete raw_base_fo" ON public.raw_base_fo;
DROP POLICY "Anon can insert raw_base_fo" ON public.raw_base_fo;
DROP POLICY "Anon can delete raw_base_gestora" ON public.raw_base_gestora;
DROP POLICY "Anon can insert raw_base_gestora" ON public.raw_base_gestora;
DROP POLICY "Anon can delete raw_base_lavoro" ON public.raw_base_lavoro;
DROP POLICY "Anon can insert raw_base_lavoro" ON public.raw_base_lavoro;
DROP POLICY "Anon can delete raw_captacao_total" ON public.raw_captacao_total;
DROP POLICY "Anon can insert raw_captacao_total" ON public.raw_captacao_total;
DROP POLICY "Anon can delete raw_comissoes_historico" ON public.raw_comissoes_historico;
DROP POLICY "Anon can insert raw_comissoes_historico" ON public.raw_comissoes_historico;
DROP POLICY "Anon can delete raw_comissoes_m0" ON public.raw_comissoes_m0;
DROP POLICY "Anon can insert raw_comissoes_m0" ON public.raw_comissoes_m0;
DROP POLICY "Anon can delete raw_consolidado_receita" ON public.raw_consolidado_receita;
DROP POLICY "Anon can insert raw_consolidado_receita" ON public.raw_consolidado_receita;
DROP POLICY "Anon can delete raw_contas_total" ON public.raw_contas_total;
DROP POLICY "Anon can insert raw_contas_total" ON public.raw_contas_total;
DROP POLICY "Anon can delete raw_depara" ON public.raw_depara;
DROP POLICY "Anon can insert raw_depara" ON public.raw_depara;
DROP POLICY "Anon can delete raw_desligados" ON public.raw_desligados;
DROP POLICY "Anon can insert raw_desligados" ON public.raw_desligados;
DROP POLICY "Anon can delete raw_diversificador_consolidado" ON public.raw_diversificador_consolidado;
DROP POLICY "Anon can insert raw_diversificador_consolidado" ON public.raw_diversificador_consolidado;
DROP POLICY "Anon can delete raw_envios_nps" ON public.raw_envios_nps;
DROP POLICY "Anon can insert raw_envios_nps" ON public.raw_envios_nps;
DROP POLICY "Anon can delete raw_nps_advisor" ON public.raw_nps_advisor;
DROP POLICY "Anon can insert raw_nps_advisor" ON public.raw_nps_advisor;
DROP POLICY "Anon can delete raw_ordem_pl" ON public.raw_ordem_pl;
DROP POLICY "Anon can insert raw_ordem_pl" ON public.raw_ordem_pl;
DROP POLICY "Anon can delete raw_podio" ON public.raw_podio;
DROP POLICY "Anon can insert raw_podio" ON public.raw_podio;
DROP POLICY "Anon can delete raw_posicao_renda_fixa" ON public.raw_posicao_renda_fixa;
DROP POLICY "Anon can insert raw_posicao_renda_fixa" ON public.raw_posicao_renda_fixa;
DROP POLICY "Anon can delete raw_positivador_m0_agrupado" ON public.raw_positivador_m0_agrupado;
DROP POLICY "Anon can insert raw_positivador_m0_agrupado" ON public.raw_positivador_m0_agrupado;
DROP POLICY "Anon can delete raw_positivador_m0_desagrupado" ON public.raw_positivador_m0_desagrupado;
DROP POLICY "Anon can insert raw_positivador_m0_desagrupado" ON public.raw_positivador_m0_desagrupado;
DROP POLICY "Anon can delete raw_positivador_total_agrupado" ON public.raw_positivador_total_agrupado;
DROP POLICY "Anon can insert raw_positivador_total_agrupado" ON public.raw_positivador_total_agrupado;
DROP POLICY "Anon can delete raw_positivador_total_desagrupado" ON public.raw_positivador_total_desagrupado;
DROP POLICY "Anon can insert raw_positivador_total_desagrupado" ON public.raw_positivador_total_desagrupado;
DROP POLICY "Anon can delete raw_produzido_historico" ON public.raw_produzido_historico;
DROP POLICY "Anon can insert raw_produzido_historico" ON public.raw_produzido_historico;
DROP POLICY "Anon can delete raw_saldo_consolidado" ON public.raw_saldo_consolidado;
DROP POLICY "Anon can insert raw_saldo_consolidado" ON public.raw_saldo_consolidado;
DROP POLICY "Anon can insert sync_logs" ON public.sync_logs;
DROP POLICY "Anon can select sync_logs" ON public.sync_logs;
DROP POLICY "Anon can update sync_logs" ON public.sync_logs;
