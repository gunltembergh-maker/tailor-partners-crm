
-- Add anon policies for sync_logs (INSERT, UPDATE, SELECT)
CREATE POLICY "Anon can insert sync_logs" ON public.sync_logs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update sync_logs" ON public.sync_logs FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can select sync_logs" ON public.sync_logs FOR SELECT TO anon USING (true);

-- Add anon policies for all raw_* tables (DELETE, INSERT)
CREATE POLICY "Anon can delete raw_captacao_total" ON public.raw_captacao_total FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert raw_captacao_total" ON public.raw_captacao_total FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can delete raw_contas_total" ON public.raw_contas_total FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert raw_contas_total" ON public.raw_contas_total FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can delete raw_diversificador_consolidado" ON public.raw_diversificador_consolidado FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert raw_diversificador_consolidado" ON public.raw_diversificador_consolidado FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can delete raw_posicao_renda_fixa" ON public.raw_posicao_renda_fixa FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert raw_posicao_renda_fixa" ON public.raw_posicao_renda_fixa FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can delete raw_saldo_consolidado" ON public.raw_saldo_consolidado FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert raw_saldo_consolidado" ON public.raw_saldo_consolidado FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can delete raw_base_crm" ON public.raw_base_crm FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert raw_base_crm" ON public.raw_base_crm FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can delete raw_depara" ON public.raw_depara FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert raw_depara" ON public.raw_depara FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can delete raw_ordem_pl" ON public.raw_ordem_pl FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert raw_ordem_pl" ON public.raw_ordem_pl FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can delete raw_positivador_total_desagrupado" ON public.raw_positivador_total_desagrupado FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert raw_positivador_total_desagrupado" ON public.raw_positivador_total_desagrupado FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can delete raw_positivador_total_agrupado" ON public.raw_positivador_total_agrupado FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert raw_positivador_total_agrupado" ON public.raw_positivador_total_agrupado FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can delete raw_positivador_m0_desagrupado" ON public.raw_positivador_m0_desagrupado FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert raw_positivador_m0_desagrupado" ON public.raw_positivador_m0_desagrupado FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can delete raw_positivador_m0_agrupado" ON public.raw_positivador_m0_agrupado FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert raw_positivador_m0_agrupado" ON public.raw_positivador_m0_agrupado FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can delete raw_comissoes_historico" ON public.raw_comissoes_historico FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert raw_comissoes_historico" ON public.raw_comissoes_historico FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can delete raw_comissoes_m0" ON public.raw_comissoes_m0 FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert raw_comissoes_m0" ON public.raw_comissoes_m0 FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can delete raw_envios_nps" ON public.raw_envios_nps FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert raw_envios_nps" ON public.raw_envios_nps FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can delete raw_nps_advisor" ON public.raw_nps_advisor FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert raw_nps_advisor" ON public.raw_nps_advisor FOR INSERT TO anon WITH CHECK (true);
