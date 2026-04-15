
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_email_domain text;
  v_domain_allowed boolean;
BEGIN
  v_nome_usuario := COALESCE(
    NEW.raw_user_meta_data->>'nome_completo',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  v_email_domain := LOWER(TRIM(split_part(NEW.email, '@', 2)));

  SELECT EXISTS(
    SELECT 1 FROM dominio_empresa WHERE LOWER(TRIM(dominio)) = v_email_domain
  ) INTO v_domain_allowed;

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

  -- Scenario A: Pre-registered in team_reference → activate
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

  -- Scenario B: Domain allowed but no pre-registration → blocked, awaiting approval
  ELSIF v_domain_allowed THEN
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
      'Novo usuário aguardando aprovação',
      'O usuário ' || v_nome_usuario || ' (' || NEW.email || ') possui domínio autorizado mas não tem pré-cadastro. Aguardando aprovação.',
      jsonb_build_object('email', NEW.email, 'nome', v_nome_usuario, 'user_id', NEW.id::text, 'dominio', v_email_domain)
    );

  -- Scenario C: Domain NOT allowed → NO profile created, just notify admin
  ELSE
    INSERT INTO notificacoes_admin (tipo, titulo, mensagem, dados)
    VALUES (
      'dominio_nao_autorizado',
      'Tentativa de acesso com domínio não autorizado',
      'O usuário ' || v_nome_usuario || ' (' || NEW.email || ') tentou acessar com domínio não autorizado: ' || v_email_domain,
      jsonb_build_object('email', NEW.email, 'nome', v_nome_usuario, 'user_id', NEW.id::text, 'dominio', v_email_domain)
    );
  END IF;

  RETURN NEW;
END;
$$;
