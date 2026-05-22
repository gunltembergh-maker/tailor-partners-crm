
-- ============================================================
-- FASE 2 — Schema + Helpers + CRUD de vínculos de Receita
-- ============================================================

-- 2.1 Tabela profile_vinculos_receita
CREATE TABLE IF NOT EXISTS public.profile_vinculos_receita (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('FA', 'FINDER', 'ADVISOR')),
  nome_pessoa text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  adicionado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tipo, nome_pessoa)
);

COMMENT ON TABLE public.profile_vinculos_receita IS
'Vínculos (FA/FINDER/ADVISOR) que cada usuário restrito pode visualizar em Receita Caixa e Tela Início.';

CREATE INDEX IF NOT EXISTS idx_profile_vinculos_user
  ON public.profile_vinculos_receita (user_id, ativo) WHERE ativo = true;

ALTER TABLE public.profile_vinculos_receita ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vinculos_select_admin_ou_self" ON public.profile_vinculos_receita;
CREATE POLICY "vinculos_select_admin_ou_self"
ON public.profile_vinculos_receita FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text = 'ADMIN'
  )
);

DROP POLICY IF EXISTS "vinculos_all_admin" ON public.profile_vinculos_receita;
CREATE POLICY "vinculos_all_admin"
ON public.profile_vinculos_receita FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text = 'ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text = 'ADMIN'
  )
);

DROP POLICY IF EXISTS "vinculos_service_role" ON public.profile_vinculos_receita;
CREATE POLICY "vinculos_service_role"
ON public.profile_vinculos_receita FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- Trigger pra atualizar atualizado_em
CREATE OR REPLACE FUNCTION public.tg_profile_vinculos_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_profile_vinculos_touch ON public.profile_vinculos_receita;
CREATE TRIGGER trg_profile_vinculos_touch
BEFORE UPDATE ON public.profile_vinculos_receita
FOR EACH ROW EXECUTE FUNCTION public.tg_profile_vinculos_touch();

-- ============================================================
-- 2.2 Helper: usuario_tem_restricao_receita
-- ============================================================
CREATE OR REPLACE FUNCTION public.usuario_tem_restricao_receita(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_role text;
BEGIN
  SELECT ur.role::text INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = p_user_id
  LIMIT 1;

  RETURN v_role IN ('COMERCIAL','BANKER','FA ASSISTENTE','FINDER','OPERACOES','ASSESSOR');
END;
$$;

GRANT EXECUTE ON FUNCTION public.usuario_tem_restricao_receita(uuid) TO authenticated;

-- ============================================================
-- 2.3 Helper: pessoas_vinculadas_usuario (com FALLBACK pra profiles)
-- Se usuário não tem linhas em profile_vinculos_receita, retorna
-- o que estiver em profiles.banker_name / finder_name / advisor_name
-- ============================================================
CREATE OR REPLACE FUNCTION public.pessoas_vinculadas_usuario(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(tipo text, nome_pessoa text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.profile_vinculos_receita pv
  WHERE pv.user_id = p_user_id AND pv.ativo = true;

  IF v_count > 0 THEN
    RETURN QUERY
    SELECT pv.tipo, pv.nome_pessoa
    FROM public.profile_vinculos_receita pv
    WHERE pv.user_id = p_user_id AND pv.ativo = true;
  ELSE
    -- Fallback: vínculo único legado em profiles
    RETURN QUERY
    SELECT 'FA'::text, p.banker_name
    FROM public.profiles p
    WHERE p.user_id = p_user_id AND COALESCE(p.banker_name,'') <> ''
    UNION ALL
    SELECT 'FINDER'::text, p.finder_name
    FROM public.profiles p
    WHERE p.user_id = p_user_id AND COALESCE(p.finder_name,'') <> ''
    UNION ALL
    SELECT 'ADVISOR'::text, p.advisor_name
    FROM public.profiles p
    WHERE p.user_id = p_user_id AND COALESCE(p.advisor_name,'') <> '';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pessoas_vinculadas_usuario(uuid) TO authenticated;

-- ============================================================
-- 2.4 CRUD RPCs
-- ============================================================

-- Listar vínculos (admin ou próprio usuário)
CREATE OR REPLACE FUNCTION public.rpc_listar_vinculos_usuario(p_user_id uuid)
RETURNS TABLE(id uuid, tipo text, nome_pessoa text, criado_em timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_user_id <> auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Sem permissão pra listar vínculos deste usuário';
  END IF;

  RETURN QUERY
  SELECT pv.id, pv.tipo, pv.nome_pessoa, pv.criado_em
  FROM public.profile_vinculos_receita pv
  WHERE pv.user_id = p_user_id AND pv.ativo = true
  ORDER BY pv.tipo, pv.nome_pessoa;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_listar_vinculos_usuario(uuid) TO authenticated;

-- Adicionar vínculo (apenas ADMIN)
CREATE OR REPLACE FUNCTION public.rpc_adicionar_vinculo(
  p_user_id uuid, p_tipo text, p_nome_pessoa text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Apenas ADMIN pode adicionar vínculos';
  END IF;

  IF p_tipo NOT IN ('FA','FINDER','ADVISOR') THEN
    RAISE EXCEPTION 'Tipo deve ser FA, FINDER ou ADVISOR';
  END IF;

  IF COALESCE(p_nome_pessoa,'') = '' THEN
    RAISE EXCEPTION 'nome_pessoa não pode ser vazio';
  END IF;

  INSERT INTO public.profile_vinculos_receita (user_id, tipo, nome_pessoa, adicionado_por)
  VALUES (p_user_id, p_tipo, p_nome_pessoa, auth.uid())
  ON CONFLICT (user_id, tipo, nome_pessoa)
  DO UPDATE SET ativo = true, atualizado_em = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_adicionar_vinculo(uuid, text, text) TO authenticated;

-- Remover vínculo (apenas ADMIN)
CREATE OR REPLACE FUNCTION public.rpc_remover_vinculo(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Apenas ADMIN pode remover vínculos';
  END IF;

  DELETE FROM public.profile_vinculos_receita WHERE id = p_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_remover_vinculo(uuid) TO authenticated;

-- Buscar nomes distintos na view de receita
CREATE OR REPLACE FUNCTION public.rpc_buscar_pessoas_raw(
  p_tipo text, p_busca text DEFAULT NULL
)
RETURNS TABLE(nome_pessoa text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_coluna text;
BEGIN
  IF p_tipo NOT IN ('FA','FINDER','ADVISOR') THEN
    RAISE EXCEPTION 'Tipo inválido';
  END IF;

  v_coluna := CASE p_tipo
    WHEN 'FA' THEN 'banker'
    WHEN 'FINDER' THEN 'finder'
    WHEN 'ADVISOR' THEN 'advisor'
  END;

  RETURN QUERY EXECUTE format(
    'SELECT DISTINCT %I::text AS nome_pessoa
     FROM public.comissoes_consolidado_filtrado
     WHERE %I IS NOT NULL AND %I::text <> ''''
       AND %I::text NOT IN (''Lavoro'',''Outros'',''NA'')
       AND ($1 IS NULL OR $1 = '''' OR LOWER(%I::text) LIKE ''%%'' || LOWER($1) || ''%%'')
     ORDER BY %I::text
     LIMIT 100',
    v_coluna, v_coluna, v_coluna, v_coluna, v_coluna, v_coluna
  ) USING p_busca;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_buscar_pessoas_raw(text, text) TO authenticated;
