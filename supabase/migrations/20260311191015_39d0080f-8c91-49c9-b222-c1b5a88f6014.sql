
-- sync_logs table
CREATE TABLE public.sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at timestamptz NOT NULL DEFAULT now(),
  source_key text NOT NULL,
  file_name text,
  source_path text,
  status text NOT NULL DEFAULT 'pending',
  rows_written integer DEFAULT 0,
  error text
);
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only on sync_logs" ON public.sync_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins can view sync_logs" ON public.sync_logs FOR SELECT TO authenticated USING (is_admin_or_lider(auth.uid()));

-- raw_captacao_total
CREATE TABLE public.raw_captacao_total (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data jsonb NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.raw_captacao_total ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role raw_captacao_total" ON public.raw_captacao_total FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins read raw_captacao_total" ON public.raw_captacao_total FOR SELECT TO authenticated USING (is_admin_or_lider(auth.uid()));

-- raw_contas_total
CREATE TABLE public.raw_contas_total (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data jsonb NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.raw_contas_total ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role raw_contas_total" ON public.raw_contas_total FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins read raw_contas_total" ON public.raw_contas_total FOR SELECT TO authenticated USING (is_admin_or_lider(auth.uid()));

-- raw_diversificador_consolidado
CREATE TABLE public.raw_diversificador_consolidado (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data jsonb NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.raw_diversificador_consolidado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role raw_diversificador_consolidado" ON public.raw_diversificador_consolidado FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins read raw_diversificador_consolidado" ON public.raw_diversificador_consolidado FOR SELECT TO authenticated USING (is_admin_or_lider(auth.uid()));

-- raw_posicao_renda_fixa
CREATE TABLE public.raw_posicao_renda_fixa (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data jsonb NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.raw_posicao_renda_fixa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role raw_posicao_renda_fixa" ON public.raw_posicao_renda_fixa FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins read raw_posicao_renda_fixa" ON public.raw_posicao_renda_fixa FOR SELECT TO authenticated USING (is_admin_or_lider(auth.uid()));

-- raw_saldo_consolidado
CREATE TABLE public.raw_saldo_consolidado (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data jsonb NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.raw_saldo_consolidado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role raw_saldo_consolidado" ON public.raw_saldo_consolidado FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins read raw_saldo_consolidado" ON public.raw_saldo_consolidado FOR SELECT TO authenticated USING (is_admin_or_lider(auth.uid()));

-- raw_base_crm
CREATE TABLE public.raw_base_crm (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data jsonb NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.raw_base_crm ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role raw_base_crm" ON public.raw_base_crm FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins read raw_base_crm" ON public.raw_base_crm FOR SELECT TO authenticated USING (is_admin_or_lider(auth.uid()));

-- raw_depara
CREATE TABLE public.raw_depara (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data jsonb NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.raw_depara ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role raw_depara" ON public.raw_depara FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins read raw_depara" ON public.raw_depara FOR SELECT TO authenticated USING (is_admin_or_lider(auth.uid()));

-- raw_ordem_pl
CREATE TABLE public.raw_ordem_pl (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data jsonb NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.raw_ordem_pl ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role raw_ordem_pl" ON public.raw_ordem_pl FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins read raw_ordem_pl" ON public.raw_ordem_pl FOR SELECT TO authenticated USING (is_admin_or_lider(auth.uid()));

-- raw_positivador_total_desagrupado
CREATE TABLE public.raw_positivador_total_desagrupado (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data jsonb NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.raw_positivador_total_desagrupado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role raw_positivador_total_desagrupado" ON public.raw_positivador_total_desagrupado FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins read raw_positivador_total_desagrupado" ON public.raw_positivador_total_desagrupado FOR SELECT TO authenticated USING (is_admin_or_lider(auth.uid()));

-- raw_positivador_total_agrupado
CREATE TABLE public.raw_positivador_total_agrupado (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data jsonb NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.raw_positivador_total_agrupado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role raw_positivador_total_agrupado" ON public.raw_positivador_total_agrupado FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins read raw_positivador_total_agrupado" ON public.raw_positivador_total_agrupado FOR SELECT TO authenticated USING (is_admin_or_lider(auth.uid()));

-- raw_positivador_m0_desagrupado
CREATE TABLE public.raw_positivador_m0_desagrupado (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data jsonb NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.raw_positivador_m0_desagrupado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role raw_positivador_m0_desagrupado" ON public.raw_positivador_m0_desagrupado FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins read raw_positivador_m0_desagrupado" ON public.raw_positivador_m0_desagrupado FOR SELECT TO authenticated USING (is_admin_or_lider(auth.uid()));

-- raw_positivador_m0_agrupado
CREATE TABLE public.raw_positivador_m0_agrupado (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data jsonb NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.raw_positivador_m0_agrupado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role raw_positivador_m0_agrupado" ON public.raw_positivador_m0_agrupado FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins read raw_positivador_m0_agrupado" ON public.raw_positivador_m0_agrupado FOR SELECT TO authenticated USING (is_admin_or_lider(auth.uid()));

-- raw_comissoes_historico
CREATE TABLE public.raw_comissoes_historico (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data jsonb NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.raw_comissoes_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role raw_comissoes_historico" ON public.raw_comissoes_historico FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins read raw_comissoes_historico" ON public.raw_comissoes_historico FOR SELECT TO authenticated USING (is_admin_or_lider(auth.uid()));

-- raw_comissoes_m0
CREATE TABLE public.raw_comissoes_m0 (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data jsonb NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.raw_comissoes_m0 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role raw_comissoes_m0" ON public.raw_comissoes_m0 FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins read raw_comissoes_m0" ON public.raw_comissoes_m0 FOR SELECT TO authenticated USING (is_admin_or_lider(auth.uid()));

-- raw_envios_nps
CREATE TABLE public.raw_envios_nps (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data jsonb NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.raw_envios_nps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role raw_envios_nps" ON public.raw_envios_nps FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins read raw_envios_nps" ON public.raw_envios_nps FOR SELECT TO authenticated USING (is_admin_or_lider(auth.uid()));

-- raw_nps_advisor
CREATE TABLE public.raw_nps_advisor (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data jsonb NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.raw_nps_advisor ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role raw_nps_advisor" ON public.raw_nps_advisor FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins read raw_nps_advisor" ON public.raw_nps_advisor FOR SELECT TO authenticated USING (is_admin_or_lider(auth.uid()));
