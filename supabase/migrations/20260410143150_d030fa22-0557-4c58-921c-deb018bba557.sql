
-- 1. Tabela de sessões
CREATE TABLE IF NOT EXISTS public.user_sessions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  login_at timestamptz DEFAULT now(),
  logout_at timestamptz DEFAULT NULL,
  duracao_minutos integer DEFAULT NULL,
  ip_address text DEFAULT NULL,
  user_agent text DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_sessions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_ver_sessoes" ON public.user_sessions_log
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('ADMIN','LIDER')
    )
  );

CREATE POLICY "service_role_sessoes" ON public.user_sessions_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "user_insert_own_session" ON public.user_sessions_log
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_update_own_session" ON public.user_sessions_log
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_sessions_user_id ON public.user_sessions_log(user_id);
CREATE INDEX idx_sessions_email ON public.user_sessions_log(email);
CREATE INDEX idx_sessions_login_at ON public.user_sessions_log(login_at DESC);

-- 2. Tabela de atividades
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  acao text NOT NULL,
  detalhe text DEFAULT NULL,
  pagina text DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_ver_atividade" ON public.user_activity_log
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('ADMIN','LIDER')
    )
  );

CREATE POLICY "service_role_atividade" ON public.user_activity_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "user_insert_own_activity" ON public.user_activity_log
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_activity_user_id ON public.user_activity_log(user_id);
CREATE INDEX idx_activity_email ON public.user_activity_log(email);
CREATE INDEX idx_activity_created_at ON public.user_activity_log(created_at DESC);

-- 3. RPC timeline de convites
CREATE OR REPLACE FUNCTION public.rpc_admin_historico_convites(p_email text)
RETURNS TABLE(
  evento text,
  data_hora timestamptz,
  detalhe text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $func$
  SELECT * FROM (
    SELECT 
      'Pré-cadastro realizado' AS evento,
      p.created_at AS data_hora,
      'Usuário pré-cadastrado pelo Admin' AS detalhe
    FROM profiles p WHERE p.email = p_email

    UNION ALL

    SELECT 
      'Convite enviado' AS evento,
      u.invited_at AS data_hora,
      'Link de convite enviado para ' || u.email AS detalhe
    FROM auth.users u WHERE u.email = p_email AND u.invited_at IS NOT NULL

    UNION ALL

    SELECT 
      'E-mail confirmado' AS evento,
      u.email_confirmed_at AS data_hora,
      'E-mail confirmado com sucesso' AS detalhe
    FROM auth.users u WHERE u.email = p_email AND u.email_confirmed_at IS NOT NULL

    UNION ALL

    SELECT 
      'Primeiro acesso' AS evento,
      u.confirmed_at AS data_hora,
      'Usuário acessou o Hub pela primeira vez' AS detalhe
    FROM auth.users u 
    JOIN profiles p ON p.user_id = u.id
    WHERE u.email = p_email AND p.primeiro_acesso = false AND u.confirmed_at IS NOT NULL
  ) t
  WHERE data_hora IS NOT NULL
  ORDER BY data_hora DESC;
$func$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_historico_convites(text) TO authenticated;

-- 4. RPC detalhe completo do usuário
CREATE OR REPLACE FUNCTION public.rpc_admin_detalhe_usuario(p_email text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'perfil', (
      SELECT jsonb_build_object(
        'id', p.id,
        'user_id', p.user_id,
        'nome', COALESCE(p.nome_completo, p.full_name),
        'email', p.email,
        'cpf', p.cpf,
        'perfil_nome', pa.nome,
        'perfil_id', p.perfil_id,
        'banker_name', p.banker_name,
        'finder_name', p.finder_name,
        'advisor_name', p.advisor_name,
        'area', p.area,
        'gestor', p.gestor,
        'empresa', p.empresa,
        'blocked', p.blocked,
        'active', p.active,
        'primeiro_acesso', p.primeiro_acesso,
        'ultimo_acesso', p.ultimo_acesso,
        'created_at', p.created_at,
        'operacao_tipo', p.operacao_tipo
      )
      FROM profiles p
      LEFT JOIN perfis_acesso pa ON pa.id = p.perfil_id
      WHERE p.email = p_email
      LIMIT 1
    ),
    'auth', (
      SELECT jsonb_build_object(
        'invited_at', u.invited_at,
        'confirmed_at', u.confirmed_at,
        'email_confirmed_at', u.email_confirmed_at,
        'last_sign_in_at', u.last_sign_in_at,
        'created_at', u.created_at
      )
      FROM auth.users u WHERE u.email = p_email LIMIT 1
    ),
    'role', (
      SELECT ur.role::text
      FROM user_roles ur
      JOIN profiles p ON p.user_id = ur.user_id
      WHERE p.email = p_email
      LIMIT 1
    ),
    'convite', (
      SELECT jsonb_build_object(
        'status', tr.convite_status,
        'enviado_em', tr.convite_enviado_em,
        'aceito_em', tr.convite_aceito_em,
        'expira_em', tr.convite_expira_em,
        'cancelado_em', tr.convite_cancelado_em,
        'reenvios', tr.convite_reenvios
      )
      FROM team_reference tr WHERE tr.email = p_email LIMIT 1
    ),
    'total_sessoes', (
      SELECT COUNT(*) FROM user_sessions_log WHERE email = p_email
    ),
    'ultima_sessao', (
      SELECT login_at FROM user_sessions_log 
      WHERE email = p_email ORDER BY login_at DESC LIMIT 1
    ),
    'total_atividades', (
      SELECT COUNT(*) FROM user_activity_log WHERE email = p_email
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_detalhe_usuario(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
