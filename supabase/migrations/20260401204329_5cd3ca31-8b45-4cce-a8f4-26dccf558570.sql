
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
BEGIN
  v_nome_usuario := COALESCE(
    NEW.raw_user_meta_data->>'nome_completo',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  SELECT role, banker_name, finder_name, advisor_name,
         COALESCE(nome, full_name), empresa, cpf, area, gestor
  INTO v_role, v_banker_name, v_finder_name, v_advisor_name,
       v_nome, v_empresa, v_cpf, v_area, v_gestor
  FROM team_reference
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
  LIMIT 1;

  -- Check if a profile already exists with same email but different user_id
  SELECT id INTO v_existing_profile_id
  FROM profiles
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
    AND user_id <> NEW.id
  LIMIT 1;

  -- If found, update existing profile to point to the new auth user
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
      blocked       = CASE WHEN v_role IS NOT NULL THEN false ELSE blocked END,
      active        = CASE WHEN v_role IS NOT NULL THEN true ELSE active END,
      updated_at    = now()
    WHERE id = v_existing_profile_id;

    -- Update user_roles too
    IF v_role IS NOT NULL THEN
      INSERT INTO user_roles (user_id, role)
      VALUES (NEW.id, v_role::app_role)
      ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

      -- Delete old user_roles for the previous user_id
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
    -- Marcar convite como aceito
    UPDATE team_reference SET
      convite_status    = 'aceito',
      convite_aceito_em = now()
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email));

    -- Criar profile liberado
    INSERT INTO profiles (
      id, user_id, email, full_name, nome_completo,
      empresa, banker_name, finder_name, advisor_name,
      cpf, area, gestor, blocked, active, primeiro_acesso
    )
    VALUES (
      NEW.id, NEW.id, NEW.email,
      COALESCE(v_nome, v_nome_usuario),
      COALESCE(v_nome, v_nome_usuario),
      COALESCE(v_empresa, 'Tailor Partners'),
      v_banker_name, v_finder_name, v_advisor_name,
      v_cpf, v_area, v_gestor,
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
      blocked       = false,
      active        = true;

    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.id, v_role::app_role)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

  ELSE
    -- Sem pré-cadastro → bloqueado + notificar admin
    INSERT INTO profiles (
      id, user_id, email, full_name, nome_completo,
      empresa, blocked, active, primeiro_acesso
    )
    VALUES (
      NEW.id, NEW.id, NEW.email,
      v_nome_usuario, v_nome_usuario,
      'Tailor Partners', true, false, true
    )
    ON CONFLICT (user_id) DO UPDATE SET
      email         = EXCLUDED.email,
      full_name     = COALESCE(EXCLUDED.full_name, profiles.full_name),
      blocked       = true,
      active        = false;

    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.id, 'ASSESSOR'::app_role)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO notificacoes_admin (tipo, titulo, mensagem, dados)
    VALUES (
      'novo_usuario_sem_acesso',
      'Novo usuário aguardando aprovação',
      'O usuário ' || v_nome_usuario || ' (' || NEW.email || ') tentou acessar sem pré-cadastro.',
      jsonb_build_object(
        'user_id', NEW.id::text,
        'email', NEW.email,
        'nome', v_nome_usuario
      )
    );
  END IF;

  RETURN NEW;
END;
$$;
