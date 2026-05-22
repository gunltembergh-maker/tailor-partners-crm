DROP FUNCTION IF EXISTS public.rpc_admin_atualizar_usuario(uuid, text, text, uuid, text, text, text, boolean, text, text);

CREATE OR REPLACE FUNCTION public.rpc_admin_atualizar_usuario(
  p_profile_id uuid,
  p_nome text DEFAULT NULL::text,
  p_email text DEFAULT NULL::text,
  p_perfil_id uuid DEFAULT NULL::uuid,
  p_banker_name text DEFAULT NULL::text,
  p_finder_name text DEFAULT NULL::text,
  p_advisor_name text DEFAULT NULL::text,
  p_blocked boolean DEFAULT NULL::boolean,
  p_area text DEFAULT NULL::text,
  p_gestor text DEFAULT NULL::text,
  p_cpf text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_role text;
  v_cpf_digits text;
  v_target_email text;
  v_profile_updated integer := 0;
  v_team_updated integer := 0;
BEGIN
  v_target_email := NULLIF(LOWER(TRIM(p_email)), '');
  v_cpf_digits := NULLIF(regexp_replace(COALESCE(p_cpf, ''), '\D', '', 'g'), '');

  IF p_perfil_id IS NOT NULL THEN
    SELECT nome INTO v_role
    FROM perfis_acesso
    WHERE id = p_perfil_id;
  END IF;

  SELECT user_id INTO v_user_id
  FROM profiles
  WHERE id = p_profile_id
     OR (v_target_email IS NOT NULL AND LOWER(TRIM(email)) = v_target_email)
  ORDER BY CASE WHEN id = p_profile_id THEN 0 ELSE 1 END
  LIMIT 1;

  UPDATE profiles
  SET
    nome_completo = COALESCE(p_nome, nome_completo),
    full_name     = COALESCE(p_nome, full_name),
    email         = COALESCE(v_target_email, email),
    perfil_id     = COALESCE(p_perfil_id, perfil_id),
    banker_name   = p_banker_name,
    finder_name   = p_finder_name,
    advisor_name  = p_advisor_name,
    blocked       = COALESCE(p_blocked, blocked),
    area          = COALESCE(p_area, area),
    gestor        = COALESCE(p_gestor, gestor),
    cpf           = COALESCE(v_cpf_digits, cpf),
    updated_at    = now()
  WHERE id = p_profile_id
     OR (v_target_email IS NOT NULL AND LOWER(TRIM(email)) = v_target_email);
  GET DIAGNOSTICS v_profile_updated = ROW_COUNT;

  UPDATE team_reference
  SET
    full_name    = COALESCE(p_nome, full_name),
    nome         = COALESCE(p_nome, nome),
    email        = COALESCE(v_target_email, email),
    role         = COALESCE(v_role, role),
    perfil_nome  = COALESCE(v_role, perfil_nome),
    banker_name  = p_banker_name,
    finder_name  = p_finder_name,
    advisor_name = p_advisor_name,
    blocked      = COALESCE(p_blocked, blocked),
    area         = COALESCE(p_area, area),
    gestor       = COALESCE(p_gestor, gestor),
    cpf          = COALESCE(v_cpf_digits, cpf),
    empresa      = COALESCE(empresa, 'Tailor Partners'),
    short_name   = COALESCE(split_part(COALESCE(p_nome, nome, full_name), ' ', 1), short_name)
  WHERE id = p_profile_id
     OR (v_target_email IS NOT NULL AND LOWER(TRIM(email)) = v_target_email);
  GET DIAGNOSTICS v_team_updated = ROW_COUNT;

  IF p_perfil_id IS NOT NULL AND v_user_id IS NOT NULL AND v_role IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typname = 'app_role'
        AND e.enumlabel = v_role
    ) THEN
      INSERT INTO user_roles(user_id, role)
      VALUES (v_user_id, v_role::app_role)
      ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
    END IF;
  END IF;

  IF p_email IS NOT NULL AND v_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET email = v_target_email
    WHERE id = v_user_id;
  END IF;

  IF v_profile_updated = 0 AND v_team_updated = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado para atualização');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'profiles_updated', v_profile_updated,
    'team_reference_updated', v_team_updated
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_atualizar_usuario(uuid, text, text, uuid, text, text, text, boolean, text, text, text) TO authenticated;

UPDATE team_reference
SET cpf = '15226934831'
WHERE LOWER(TRIM(email)) = 'marcelo.santos@tailorpartners.com.br'
  AND COALESCE(NULLIF(regexp_replace(COALESCE(cpf, ''), '\D', '', 'g'), ''), '') = '';

UPDATE team_reference tr
SET cpf = regexp_replace(p.cpf, '\D', '', 'g')
FROM profiles p
WHERE LOWER(TRIM(tr.email)) = LOWER(TRIM(p.email))
  AND COALESCE(NULLIF(regexp_replace(COALESCE(tr.cpf, ''), '\D', '', 'g'), ''), '') = ''
  AND NULLIF(regexp_replace(COALESCE(p.cpf, ''), '\D', '', 'g'), '') IS NOT NULL;

UPDATE profiles p
SET cpf = regexp_replace(tr.cpf, '\D', '', 'g'),
    updated_at = now()
FROM team_reference tr
WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(tr.email))
  AND COALESCE(NULLIF(regexp_replace(COALESCE(p.cpf, ''), '\D', '', 'g'), ''), '') = ''
  AND NULLIF(regexp_replace(COALESCE(tr.cpf, ''), '\D', '', 'g'), '') IS NOT NULL;