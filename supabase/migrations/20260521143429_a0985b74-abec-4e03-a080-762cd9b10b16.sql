-- =========================================
-- 0) LIMPEZA: remover usuário antigo do auth.users
-- =========================================
DELETE FROM auth.identities 
WHERE LOWER(provider_id) = 'alessandro.oliveira@codigoaeducacao.com.br'
   OR user_id IN (SELECT id FROM auth.users WHERE LOWER(email) = 'alessandro.oliveira@codigoaeducacao.com.br');

DELETE FROM auth.users 
WHERE LOWER(email) = 'alessandro.oliveira@codigoaeducacao.com.br';

-- =========================================
-- 1) Garantir pgcrypto disponível
-- =========================================
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- =========================================
-- 2) Coluna tipo_usuario em profiles
-- =========================================
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS tipo_usuario text 
  NOT NULL DEFAULT 'interno';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_tipo_usuario_check'
  ) THEN
    ALTER TABLE public.profiles 
      ADD CONSTRAINT profiles_tipo_usuario_check 
      CHECK (tipo_usuario IN ('interno', 'externo'));
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.tipo_usuario IS 
'interno = usuário com email do grupo Tailor (SSO Microsoft Entra ID). externo = Conselheiro, Sócio investidor, Auditor, etc. (autenticação local).';

-- =========================================
-- 3) Tabela convites_externos
-- =========================================
CREATE TABLE IF NOT EXISTS public.convites_externos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  nome text NOT NULL,
  perfil_role app_role NOT NULL,
  empresa text,
  token text UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  senha_provisoria_hash text NOT NULL,
  expira_em timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  ativado_em timestamptz,
  convidado_por uuid,
  observacoes text,
  criado_em timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_convites_externos_email_lower 
  ON public.convites_externos (lower(email))
  WHERE ativado_em IS NULL;

COMMENT ON TABLE public.convites_externos IS 
'Convites pendentes/ativados de usuários externos. Token expira em 7 dias.';

ALTER TABLE public.convites_externos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "convites_externos_select_admin" ON public.convites_externos;
CREATE POLICY "convites_externos_select_admin"
ON public.convites_externos FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'ADMIN')
);

DROP POLICY IF EXISTS "convites_externos_service_role" ON public.convites_externos;
CREATE POLICY "convites_externos_service_role"
ON public.convites_externos FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- =========================================
-- 4) Função is_dominio_corporativo
-- =========================================
CREATE OR REPLACE FUNCTION public.is_dominio_corporativo(p_email text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_dominio text;
  v_dominios_pessoais text[] := ARRAY[
    'gmail.com', 'googlemail.com',
    'hotmail.com', 'hotmail.com.br', 'outlook.com', 'outlook.com.br', 
    'live.com', 'live.com.br', 'msn.com',
    'yahoo.com', 'yahoo.com.br', 'ymail.com', 'rocketmail.com',
    'icloud.com', 'me.com', 'mac.com',
    'aol.com', 'aol.com.br',
    'protonmail.com', 'proton.me', 'pm.me',
    'mail.com', 'gmx.com', 'gmx.net', 'gmx.com.br',
    'zoho.com', 'fastmail.com', 'tutanota.com',
    'bol.com.br', 'uol.com.br', 'terra.com.br', 'ig.com.br', 
    'r7.com', 'oi.com.br', 'globo.com', 'globomail.com'
  ];
BEGIN
  IF p_email IS NULL OR p_email = '' THEN
    RETURN false;
  END IF;
  v_dominio := LOWER(SPLIT_PART(p_email, '@', 2));
  IF v_dominio = '' OR v_dominio IS NULL THEN
    RETURN false;
  END IF;
  RETURN NOT (v_dominio = ANY(v_dominios_pessoais));
END;
$$;

COMMENT ON FUNCTION public.is_dominio_corporativo IS 
'Valida que o email NÃO é de provedor pessoal (Gmail/Hotmail/etc).';

-- =========================================
-- 5) RPC rpc_admin_convidar_externo
-- =========================================
CREATE OR REPLACE FUNCTION public.rpc_admin_convidar_externo(
  p_email text,
  p_nome text,
  p_perfil_role app_role,
  p_empresa text DEFAULT NULL,
  p_observacoes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_admin_check boolean;
  v_token text;
  v_senha_provisoria text;
  v_senha_hash text;
  v_convite_id uuid;
  v_email_normalizado text;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text = 'ADMIN'
  ) INTO v_admin_check;
  
  IF NOT v_admin_check THEN
    RAISE EXCEPTION 'Apenas ADMIN pode convidar usuários externos';
  END IF;
  
  v_email_normalizado := LOWER(TRIM(p_email));
  
  IF v_email_normalizado !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Email inválido: %', p_email;
  END IF;
  
  IF NOT is_dominio_corporativo(v_email_normalizado) THEN
    RAISE EXCEPTION 'Email pessoal não é permitido. Use email corporativo.';
  END IF;
  
  IF EXISTS (SELECT 1 FROM profiles WHERE LOWER(email) = v_email_normalizado AND active = true) THEN
    RAISE EXCEPTION 'Já existe usuário ativo com este email';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM convites_externos 
    WHERE LOWER(email) = v_email_normalizado AND ativado_em IS NULL
  ) THEN
    RAISE EXCEPTION 'Já existe convite pendente para este email';
  END IF;
  
  v_senha_provisoria := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  v_senha_hash := extensions.crypt(v_senha_provisoria, extensions.gen_salt('bf', 10));
  v_token := replace(gen_random_uuid()::text, '-', '');
  
  INSERT INTO convites_externos (
    email, nome, perfil_role, empresa, token, 
    senha_provisoria_hash, convidado_por, observacoes
  )
  VALUES (
    v_email_normalizado, p_nome, p_perfil_role, p_empresa, v_token,
    v_senha_hash, auth.uid(), p_observacoes
  )
  RETURNING id INTO v_convite_id;
  
  RETURN jsonb_build_object(
    'convite_id', v_convite_id,
    'email', v_email_normalizado,
    'nome', p_nome,
    'token', v_token,
    'senha_provisoria', v_senha_provisoria,
    'expira_em', (now() + interval '7 days')::text
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_convidar_externo TO authenticated;

-- =========================================
-- 6) RPC rpc_validar_token_ativacao
-- =========================================
CREATE OR REPLACE FUNCTION public.rpc_validar_token_ativacao(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_convite record;
BEGIN
  SELECT id, email, nome, empresa, expira_em, ativado_em
  INTO v_convite
  FROM convites_externos
  WHERE token = p_token;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valido', false, 'erro', 'token_invalido');
  END IF;
  
  IF v_convite.ativado_em IS NOT NULL THEN
    RETURN jsonb_build_object('valido', false, 'erro', 'ja_ativado');
  END IF;
  
  IF v_convite.expira_em < now() THEN
    RETURN jsonb_build_object('valido', false, 'erro', 'expirado');
  END IF;
  
  RETURN jsonb_build_object(
    'valido', true,
    'email', v_convite.email,
    'nome', v_convite.nome,
    'empresa', v_convite.empresa
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_validar_token_ativacao TO anon, authenticated;

-- =========================================
-- 7) RPC rpc_validar_ativacao_dados 
--    (valida token + senha_provisoria + nova_senha, retorna dados; NÃO marca ativado)
-- =========================================
CREATE OR REPLACE FUNCTION public.rpc_validar_ativacao_dados(
  p_token text,
  p_senha_provisoria text,
  p_nova_senha text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_convite record;
BEGIN
  SELECT * INTO v_convite FROM convites_externos WHERE token = p_token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Token inválido'; END IF;
  IF v_convite.ativado_em IS NOT NULL THEN RAISE EXCEPTION 'Convite já foi ativado'; END IF;
  IF v_convite.expira_em < now() THEN RAISE EXCEPTION 'Convite expirado. Solicite novo convite ao Admin.'; END IF;
  
  IF extensions.crypt(p_senha_provisoria, v_convite.senha_provisoria_hash) <> v_convite.senha_provisoria_hash THEN
    RAISE EXCEPTION 'Senha provisória incorreta';
  END IF;
  
  IF length(p_nova_senha) < 8 THEN
    RAISE EXCEPTION 'Senha deve ter no mínimo 8 caracteres';
  END IF;
  IF p_nova_senha !~ '[A-Z]' OR p_nova_senha !~ '[a-z]' OR p_nova_senha !~ '[0-9]' THEN
    RAISE EXCEPTION 'Senha deve conter ao menos 1 letra maiúscula, 1 minúscula e 1 número';
  END IF;
  
  RETURN jsonb_build_object(
    'convite_id', v_convite.id,
    'email', v_convite.email,
    'nome', v_convite.nome,
    'perfil_role', v_convite.perfil_role,
    'empresa', v_convite.empresa
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_validar_ativacao_dados TO anon, authenticated;

-- =========================================
-- 8) RPC rpc_marcar_convite_ativado 
--    (chamada pela edge function após criar auth user com sucesso)
-- =========================================
CREATE OR REPLACE FUNCTION public.rpc_marcar_convite_ativado(p_convite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE convites_externos SET ativado_em = now() WHERE id = p_convite_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_marcar_convite_ativado TO service_role;

-- =========================================
-- 9) Permissão convidar_usuario_externo em perfis_acesso
-- =========================================
UPDATE perfis_acesso
SET permissoes = jsonb_set(
  COALESCE(permissoes, '{}'::jsonb),
  '{convidar_usuario_externo}',
  'false'::jsonb,
  true
)
WHERE NOT (permissoes ? 'convidar_usuario_externo');

UPDATE perfis_acesso
SET permissoes = jsonb_set(
  permissoes,
  '{convidar_usuario_externo}',
  'true'::jsonb
)
WHERE nome = 'ADMIN';