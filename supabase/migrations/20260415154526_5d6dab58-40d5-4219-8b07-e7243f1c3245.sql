
-- Drop all overloads of rpc_admin_salvar_usuario
DROP FUNCTION IF EXISTS public.rpc_admin_salvar_usuario(text,text,text,text,text,text,text,text);
DROP FUNCTION IF EXISTS public.rpc_admin_salvar_usuario(text,text,text,text,text,text,text,text,text);
DROP FUNCTION IF EXISTS public.rpc_admin_salvar_usuario(text,text,text,text,text,text,text,text,text,text,text);
DROP FUNCTION IF EXISTS public.rpc_admin_salvar_usuario(text,text,text,text,text,text,text,text,text,text,text,text);

-- Recreate with correct param order matching the call site
CREATE FUNCTION public.rpc_admin_salvar_usuario(
  p_email text, p_nome text, p_role text, p_perfil_nome text,
  p_banker_name text, p_finder_name text, p_empresa text,
  p_advisor_name text, p_cpf text, p_area text, p_gestor text,
  p_operacao_tipo text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_perfil_id uuid;
BEGIN
  SELECT id INTO v_perfil_id FROM perfis_acesso WHERE nome = p_perfil_nome LIMIT 1;

  INSERT INTO team_reference (
    email, full_name, nome, role, banker_name, empresa,
    short_name, unit, finder_name, advisor_name, cpf,
    area, gestor, operacao_tipo, convite_status, perfil_nome
  )
  VALUES (
    LOWER(TRIM(p_email)), p_nome, p_nome, p_role,
    p_banker_name, COALESCE(p_empresa, 'Tailor Partners'),
    split_part(p_nome, ' ', 1), COALESCE(p_role, 'BANKER'),
    p_finder_name, p_advisor_name,
    REGEXP_REPLACE(COALESCE(p_cpf,''), '[^0-9]', '', 'g'),
    p_area, p_gestor, p_operacao_tipo, 'pendente', p_perfil_nome
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name    = EXCLUDED.full_name,
    nome         = EXCLUDED.nome,
    role         = EXCLUDED.role,
    banker_name  = EXCLUDED.banker_name,
    empresa      = EXCLUDED.empresa,
    finder_name  = EXCLUDED.finder_name,
    advisor_name = EXCLUDED.advisor_name,
    cpf          = EXCLUDED.cpf,
    area         = EXCLUDED.area,
    gestor       = EXCLUDED.gestor,
    operacao_tipo = EXCLUDED.operacao_tipo,
    short_name   = EXCLUDED.short_name,
    perfil_nome  = EXCLUDED.perfil_nome,
    convite_status = 'pendente',
    convite_cancelado_em = NULL;

  UPDATE user_roles ur
    SET role = p_role::app_role
  FROM profiles p
  WHERE ur.user_id = p.user_id
    AND LOWER(TRIM(p.email)) = LOWER(TRIM(p_email));

  UPDATE profiles SET
    nome_completo  = p_nome,
    full_name      = p_nome,
    banker_name    = p_banker_name,
    empresa        = COALESCE(p_empresa, 'Tailor Partners'),
    finder_name    = p_finder_name,
    advisor_name   = p_advisor_name,
    cpf            = REGEXP_REPLACE(COALESCE(p_cpf,''), '[^0-9]', '', 'g'),
    area           = p_area,
    gestor         = p_gestor,
    operacao_tipo  = p_operacao_tipo,
    perfil_id      = v_perfil_id,
    active         = CASE WHEN blocked THEN active ELSE true END,
    blocked        = false
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email));

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$function$;

-- Improve handle_new_user for SSO and re-registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_role         text;
  v_banker_name  text;
  v_finder_name  text;
  v_advisor_name text;
  v_nome         text;
  v_empresa      text;
  v_cpf          text;
  v_area         text;
  v_gestor       text;
  v_nome_usuario text;
  v_existing_profile_id uuid;
  v_perfil_nome  text;
  v_perfil_id    uuid;
  v_operacao_tipo text;
BEGIN
  v_nome_usuario := COALESCE(
    NEW.raw_user_meta_data->>'nome_completo',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  SELECT role, banker_name, finder_name, advisor_name,
         COALESCE(nome, full_name), empresa, cpf, area, gestor,
         perfil_nome, operacao_tipo
  INTO v_role, v_banker_name, v_finder_name, v_advisor_name,
       v_nome, v_empresa, v_cpf, v_area, v_gestor,
       v_perfil_nome, v_operacao_tipo
  FROM team_reference
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
  LIMIT 1;

  IF v_perfil_nome IS NOT NULL THEN
    SELECT id INTO v_perfil_id FROM perfis_acesso WHERE nome = v_perfil_nome LIMIT 1;
  END IF;

  -- Check if a profile already exists with same email (any user_id)
  SELECT id INTO v_existing_profile_id
  FROM profiles
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
  LIMIT 1;

  IF v_existing_profile_id IS NOT NULL THEN
    UPDATE profiles SET
      user_id       = NEW.id,
      id            = NEW.id,
      email         = NEW.email,
      full_name     = COALESCE(v_nome, v_nome_usuario, full_name),
      nome_completo = COALESCE(v_nome, v_nome_usuario, nome_completo),
      empresa       = COALESCE(v_empresa, empresa),
      banker_name   = COALESCE(v_banker_name, banker_name),
      finder_name   = COALESCE(v_finder_name, finder_name),
      advisor_name  = COALESCE(v_advisor_name, advisor_name),
      cpf           = COALESCE(v_cpf, cpf),
      area          = COALESCE(v_area, area),
      gestor        = COALESCE(v_gestor, gestor),
      operacao_tipo = COALESCE(v_operacao_tipo, operacao_tipo),
      perfil_id     = COALESCE(v_perfil_id, perfil_id),
      blocked       = CASE WHEN v_role IS NOT NULL THEN false ELSE blocked END,
      active        = CASE WHEN v_role IS NOT NULL THEN true ELSE active END,
      primeiro_acesso = true,
      updated_at    = now()
    WHERE id = v_existing_profile_id;

    IF v_role IS NOT NULL THEN
      INSERT INTO user_roles (user_id, role)
      VALUES (NEW.id, v_role::app_role)
      ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

      DELETE FROM user_roles
      WHERE user_id NOT IN (SELECT au.id FROM auth.users au)
        AND user_id <> NEW.id;

      UPDATE team_reference SET
        convite_status    = 'aceito',
        convite_aceito_em = now()
      WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email));
    END IF;

    RETURN NEW;
  END IF;

  IF v_role IS NOT NULL THEN
    UPDATE team_reference SET
      convite_status    = 'aceito',
      convite_aceito_em = now()
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email));

    INSERT INTO profiles (
      id, user_id, email, full_name, nome_completo,
      empresa, banker_name, finder_name, advisor_name,
      cpf, area, gestor, operacao_tipo, perfil_id,
      blocked, active, primeiro_acesso
    )
    VALUES (
      NEW.id, NEW.id, NEW.email,
      COALESCE(v_nome, v_nome_usuario),
      COALESCE(v_nome, v_nome_usuario),
      COALESCE(v_empresa, 'Tailor Partners'),
      v_banker_name, v_finder_name, v_advisor_name,
      v_cpf, v_area, v_gestor, v_operacao_tipo, v_perfil_id,
      false, true, true
    )
    ON CONFLICT (user_id) DO UPDATE SET
      email         = EXCLUDED.email,
      full_name     = COALESCE(EXCLUDED.full_name, profiles.full_name),
      nome_completo = COALESCE(EXCLUDED.nome_completo, profiles.nome_completo),
      empresa       = COALESCE(EXCLUDED.empresa, profiles.empresa),
      banker_name   = EXCLUDED.banker_name,
      finder_name   = EXCLUDED.finder_name,
      advisor_name  = EXCLUDED.advisor_name,
      cpf           = COALESCE(EXCLUDED.cpf, profiles.cpf),
      area          = EXCLUDED.area,
      gestor        = EXCLUDED.gestor,
      operacao_tipo = EXCLUDED.operacao_tipo,
      perfil_id     = COALESCE(EXCLUDED.perfil_id, profiles.perfil_id),
      blocked       = false,
      active        = true;

    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.id, v_role::app_role)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

  ELSE
    INSERT INTO profiles (
      id, user_id, email, full_name, nome_completo,
      empresa, blocked, active, primeiro_acesso
    )
    VALUES (
      NEW.id, NEW.id, NEW.email,
      v_nome_usuario, v_nome_usuario,
      COALESCE(v_empresa, 'Tailor Partners'),
      true, false, true
    )
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO notificacoes_admin (tipo, titulo, mensagem, dados)
    VALUES (
      'novo_usuario_sem_cadastro',
      'Novo usuário sem pré-cadastro',
      'O usuário ' || v_nome_usuario || ' (' || NEW.email || ') tentou acessar mas não possui pré-cadastro.',
      jsonb_build_object('email', NEW.email, 'nome', v_nome_usuario, 'user_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$function$;
