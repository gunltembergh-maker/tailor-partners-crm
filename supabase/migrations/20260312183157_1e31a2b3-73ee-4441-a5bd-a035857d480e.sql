
-- Create raw_consolidado_receita table
CREATE TABLE public.raw_consolidado_receita (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data jsonb NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.raw_consolidado_receita ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as other raw tables)
CREATE POLICY "Admins read raw_consolidado_receita" ON public.raw_consolidado_receita FOR SELECT TO authenticated USING (is_admin_or_lider(auth.uid()));
CREATE POLICY "Anon can delete raw_consolidado_receita" ON public.raw_consolidado_receita FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert raw_consolidado_receita" ON public.raw_consolidado_receita FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Service role raw_consolidado_receita" ON public.raw_consolidado_receita FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Add authenticated admin DELETE/INSERT policies on ALL raw tables + sync_logs
-- so the frontend (authenticated session) can perform imports

-- raw_captacao_total
CREATE POLICY "Authenticated admin can delete raw_captacao_total" ON public.raw_captacao_total FOR DELETE TO authenticated USING (is_admin_or_lider(auth.uid()));
CREATE POLICY "Authenticated admin can insert raw_captacao_total" ON public.raw_captacao_total FOR INSERT TO authenticated WITH CHECK (is_admin_or_lider(auth.uid()));

-- raw_contas_total
CREATE POLICY "Authenticated admin can delete raw_contas_total" ON public.raw_contas_total FOR DELETE TO authenticated USING (is_admin_or_lider(auth.uid()));
CREATE POLICY "Authenticated admin can insert raw_contas_total" ON public.raw_contas_total FOR INSERT TO authenticated WITH CHECK (is_admin_or_lider(auth.uid()));

-- raw_base_crm
CREATE POLICY "Authenticated admin can delete raw_base_crm" ON public.raw_base_crm FOR DELETE TO authenticated USING (is_admin_or_lider(auth.uid()));
CREATE POLICY "Authenticated admin can insert raw_base_crm" ON public.raw_base_crm FOR INSERT TO authenticated WITH CHECK (is_admin_or_lider(auth.uid()));

-- raw_depara
CREATE POLICY "Authenticated admin can delete raw_depara" ON public.raw_depara FOR DELETE TO authenticated USING (is_admin_or_lider(auth.uid()));
CREATE POLICY "Authenticated admin can insert raw_depara" ON public.raw_depara FOR INSERT TO authenticated WITH CHECK (is_admin_or_lider(auth.uid()));

-- raw_diversificador_consolidado
CREATE POLICY "Authenticated admin can delete raw_diversificador_consolidado" ON public.raw_diversificador_consolidado FOR DELETE TO authenticated USING (is_admin_or_lider(auth.uid()));
CREATE POLICY "Authenticated admin can insert raw_diversificador_consolidado" ON public.raw_diversificador_consolidado FOR INSERT TO authenticated WITH CHECK (is_admin_or_lider(auth.uid()));

-- raw_ordem_pl
CREATE POLICY "Authenticated admin can delete raw_ordem_pl" ON public.raw_ordem_pl FOR DELETE TO authenticated USING (is_admin_or_lider(auth.uid()));
CREATE POLICY "Authenticated admin can insert raw_ordem_pl" ON public.raw_ordem_pl FOR INSERT TO authenticated WITH CHECK (is_admin_or_lider(auth.uid()));

-- raw_positivador_total_desagrupado
CREATE POLICY "Authenticated admin can delete raw_positivador_total_desagrupado" ON public.raw_positivador_total_desagrupado FOR DELETE TO authenticated USING (is_admin_or_lider(auth.uid()));
CREATE POLICY "Authenticated admin can insert raw_positivador_total_desagrupado" ON public.raw_positivador_total_desagrupado FOR INSERT TO authenticated WITH CHECK (is_admin_or_lider(auth.uid()));

-- raw_positivador_total_agrupado
CREATE POLICY "Authenticated admin can delete raw_positivador_total_agrupado" ON public.raw_positivador_total_agrupado FOR DELETE TO authenticated USING (is_admin_or_lider(auth.uid()));
CREATE POLICY "Authenticated admin can insert raw_positivador_total_agrupado" ON public.raw_positivador_total_agrupado FOR INSERT TO authenticated WITH CHECK (is_admin_or_lider(auth.uid()));

-- raw_positivador_m0_desagrupado
CREATE POLICY "Authenticated admin can delete raw_positivador_m0_desagrupado" ON public.raw_positivador_m0_desagrupado FOR DELETE TO authenticated USING (is_admin_or_lider(auth.uid()));
CREATE POLICY "Authenticated admin can insert raw_positivador_m0_desagrupado" ON public.raw_positivador_m0_desagrupado FOR INSERT TO authenticated WITH CHECK (is_admin_or_lider(auth.uid()));

-- raw_positivador_m0_agrupado
CREATE POLICY "Authenticated admin can delete raw_positivador_m0_agrupado" ON public.raw_positivador_m0_agrupado FOR DELETE TO authenticated USING (is_admin_or_lider(auth.uid()));
CREATE POLICY "Authenticated admin can insert raw_positivador_m0_agrupado" ON public.raw_positivador_m0_agrupado FOR INSERT TO authenticated WITH CHECK (is_admin_or_lider(auth.uid()));

-- raw_comissoes_historico
CREATE POLICY "Authenticated admin can delete raw_comissoes_historico" ON public.raw_comissoes_historico FOR DELETE TO authenticated USING (is_admin_or_lider(auth.uid()));
CREATE POLICY "Authenticated admin can insert raw_comissoes_historico" ON public.raw_comissoes_historico FOR INSERT TO authenticated WITH CHECK (is_admin_or_lider(auth.uid()));

-- raw_comissoes_m0
CREATE POLICY "Authenticated admin can delete raw_comissoes_m0" ON public.raw_comissoes_m0 FOR DELETE TO authenticated USING (is_admin_or_lider(auth.uid()));
CREATE POLICY "Authenticated admin can insert raw_comissoes_m0" ON public.raw_comissoes_m0 FOR INSERT TO authenticated WITH CHECK (is_admin_or_lider(auth.uid()));

-- raw_consolidado_receita (authenticated)
CREATE POLICY "Authenticated admin can delete raw_consolidado_receita" ON public.raw_consolidado_receita FOR DELETE TO authenticated USING (is_admin_or_lider(auth.uid()));
CREATE POLICY "Authenticated admin can insert raw_consolidado_receita" ON public.raw_consolidado_receita FOR INSERT TO authenticated WITH CHECK (is_admin_or_lider(auth.uid()));

-- sync_logs: authenticated admin can insert and update
CREATE POLICY "Authenticated admin can insert sync_logs" ON public.sync_logs FOR INSERT TO authenticated WITH CHECK (is_admin_or_lider(auth.uid()));
CREATE POLICY "Authenticated admin can update sync_logs" ON public.sync_logs FOR UPDATE TO authenticated USING (is_admin_or_lider(auth.uid())) WITH CHECK (is_admin_or_lider(auth.uid()));
