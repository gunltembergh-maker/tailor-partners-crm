-- ============================================================
-- TABELAS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_destinatarios_automaticos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  modulo text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  adicionado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, modulo)
);

COMMENT ON TABLE public.email_destinatarios_automaticos IS
'Lista solta de destinatários por módulo de email automático. Admin gerencia caso a caso.';

CREATE INDEX IF NOT EXISTS idx_email_dest_modulo_ativo
  ON public.email_destinatarios_automaticos(modulo, ativo);

ALTER TABLE public.email_destinatarios_automaticos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_destinatarios_automaticos_admin_all" ON public.email_destinatarios_automaticos;
CREATE POLICY "email_destinatarios_automaticos_admin_all"
ON public.email_destinatarios_automaticos FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'ADMIN')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'ADMIN')
);

DROP POLICY IF EXISTS "email_destinatarios_automaticos_service_role" ON public.email_destinatarios_automaticos;
CREATE POLICY "email_destinatarios_automaticos_service_role"
ON public.email_destinatarios_automaticos FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.email_disparos_automaticos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo text NOT NULL,
  data_envio date NOT NULL,
  disparado_em timestamptz NOT NULL DEFAULT now(),
  total_destinatarios int NOT NULL,
  total_sucessos int NOT NULL DEFAULT 0,
  total_falhas int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'em_processamento',
  forcado_por uuid,
  detalhes_erro jsonb,
  finalizado_em timestamptz,
  UNIQUE(modulo, data_envio)
);

COMMENT ON TABLE public.email_disparos_automaticos IS
'Histórico de disparos automáticos. UNIQUE(modulo,data_envio) garante idempotência.';

CREATE INDEX IF NOT EXISTS idx_email_disparos_modulo_data
  ON public.email_disparos_automaticos(modulo, data_envio DESC);

ALTER TABLE public.email_disparos_automaticos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_disparos_automaticos_select_admin" ON public.email_disparos_automaticos;
CREATE POLICY "email_disparos_automaticos_select_admin"
ON public.email_disparos_automaticos FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'ADMIN')
);

DROP POLICY IF EXISTS "email_disparos_automaticos_service_role" ON public.email_disparos_automaticos;
CREATE POLICY "email_disparos_automaticos_service_role"
ON public.email_disparos_automaticos FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.email_schedules_config (
  modulo text PRIMARY KEY,
  ativo boolean NOT NULL DEFAULT true,
  horario_envio time NOT NULL DEFAULT '08:00:00',
  dias_semana int[] NOT NULL DEFAULT '{1,2,3,4,5}',
  pausado_por uuid,
  pausado_em timestamptz,
  motivo_pausa text,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.email_schedules_config IS
'Configuração e status (pausado/ativo) dos schedules automáticos por módulo.';

ALTER TABLE public.email_schedules_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_schedules_config_admin_all" ON public.email_schedules_config;
CREATE POLICY "email_schedules_config_admin_all"
ON public.email_schedules_config FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'ADMIN')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'ADMIN')
);

DROP POLICY IF EXISTS "email_schedules_config_service_role" ON public.email_schedules_config;
CREATE POLICY "email_schedules_config_service_role"
ON public.email_schedules_config FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================
-- PRÉ-POPULAÇÃO
-- ============================================================

INSERT INTO public.email_schedules_config (modulo, ativo, horario_envio, dias_semana)
VALUES ('receita_caixa', true, '08:00:00', '{1,2,3,4,5}')
ON CONFLICT (modulo) DO NOTHING;

INSERT INTO public.email_destinatarios_automaticos (user_id, modulo, ativo, adicionado_por)
SELECT p.user_id, 'receita_caixa', true, p.user_id
FROM public.profiles p
WHERE p.email = 'alessandro.oliveira@tailorpartners.com.br'
  AND p.active = true
ON CONFLICT (user_id, modulo) DO NOTHING;

-- ============================================================
-- RPCs
-- ============================================================

CREATE OR REPLACE FUNCTION public.rpc_listar_destinatarios_automaticos(p_modulo text)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  nome text,
  email text,
  role text,
  ativo boolean,
  criado_em timestamptz,
  adicionado_por_nome text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text = 'ADMIN') THEN
    RAISE EXCEPTION 'Apenas ADMIN pode listar destinatários';
  END IF;
  RETURN QUERY
  SELECT
    eda.id,
    eda.user_id,
    COALESCE(p.nome_completo, p.full_name, p.nome, 'Sem nome') AS nome,
    p.email,
    ur.role::text,
    eda.ativo,
    eda.criado_em,
    COALESCE(pp.nome_completo, pp.full_name, pp.nome) AS adicionado_por_nome
  FROM email_destinatarios_automaticos eda
  JOIN profiles p ON p.user_id = eda.user_id
  LEFT JOIN user_roles ur ON ur.user_id = p.user_id
  LEFT JOIN profiles pp ON pp.user_id = eda.adicionado_por
  WHERE eda.modulo = p_modulo
  ORDER BY eda.ativo DESC, COALESCE(p.nome_completo, p.full_name, p.nome) ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_adicionar_destinatario_automatico(
  p_user_id uuid,
  p_modulo text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text = 'ADMIN') THEN
    RAISE EXCEPTION 'Apenas ADMIN pode adicionar destinatários';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = p_user_id AND active = true) THEN
    RAISE EXCEPTION 'Usuário não existe ou não está ativo';
  END IF;
  INSERT INTO email_destinatarios_automaticos (user_id, modulo, ativo, adicionado_por)
  VALUES (p_user_id, p_modulo, true, auth.uid())
  ON CONFLICT (user_id, modulo) DO UPDATE
    SET ativo = true, atualizado_em = now(), adicionado_por = EXCLUDED.adicionado_por
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_remover_destinatario_automatico(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text = 'ADMIN') THEN
    RAISE EXCEPTION 'Apenas ADMIN pode remover destinatários';
  END IF;
  DELETE FROM email_destinatarios_automaticos WHERE id = p_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_toggle_schedule(
  p_modulo text,
  p_motivo text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_novo_estado boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text = 'ADMIN') THEN
    RAISE EXCEPTION 'Apenas ADMIN pode controlar schedules';
  END IF;
  SELECT NOT ativo INTO v_novo_estado FROM email_schedules_config WHERE modulo = p_modulo;
  IF v_novo_estado IS NULL THEN
    RAISE EXCEPTION 'Módulo % não configurado', p_modulo;
  END IF;
  UPDATE email_schedules_config
  SET
    ativo = v_novo_estado,
    pausado_por = CASE WHEN NOT v_novo_estado THEN auth.uid() ELSE NULL END,
    pausado_em = CASE WHEN NOT v_novo_estado THEN now() ELSE NULL END,
    motivo_pausa = CASE WHEN NOT v_novo_estado THEN p_motivo ELSE NULL END,
    atualizado_em = now()
  WHERE modulo = p_modulo;
  RETURN v_novo_estado;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_historico_disparos(
  p_modulo text,
  p_limit int DEFAULT 30
)
RETURNS TABLE(
  id uuid,
  data_envio date,
  disparado_em timestamptz,
  total_destinatarios int,
  total_sucessos int,
  total_falhas int,
  status text,
  forcado_por_nome text,
  finalizado_em timestamptz,
  detalhes_erro jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text = 'ADMIN') THEN
    RAISE EXCEPTION 'Apenas ADMIN pode ver histórico';
  END IF;
  RETURN QUERY
  SELECT
    eda.id,
    eda.data_envio,
    eda.disparado_em,
    eda.total_destinatarios,
    eda.total_sucessos,
    eda.total_falhas,
    eda.status,
    COALESCE(p.nome_completo, p.full_name, p.nome) AS forcado_por_nome,
    eda.finalizado_em,
    eda.detalhes_erro
  FROM email_disparos_automaticos eda
  LEFT JOIN profiles p ON p.user_id = eda.forcado_por
  WHERE eda.modulo = p_modulo
  ORDER BY eda.disparado_em DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_listar_destinatarios_automaticos(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_adicionar_destinatario_automatico(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_remover_destinatario_automatico(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_toggle_schedule(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_historico_disparos(text, int) TO authenticated;