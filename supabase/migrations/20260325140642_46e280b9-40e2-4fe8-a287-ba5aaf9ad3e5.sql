
CREATE OR REPLACE FUNCTION public.rpc_admin_salvar_usuario(
  p_email text,
  p_nome text,
  p_role text,
  p_perfil_nome text DEFAULT NULL,
  p_banker_name text DEFAULT NULL,
  p_empresa text DEFAULT 'Tailor Partners'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO team_reference (
    email, full_name, nome, role, perfil_nome, banker_name, empresa, short_name, unit
  )
  VALUES (
    LOWER(TRIM(p_email)),
    p_nome,
    p_nome,
    p_role,
    COALESCE(p_perfil_nome, p_role),
    p_banker_name,
    COALESCE(p_empresa, 'Tailor Partners'),
    split_part(p_nome, ' ', 1),
    COALESCE(p_role, 'BANKER')
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name   = EXCLUDED.full_name,
    nome        = EXCLUDED.nome,
    role        = EXCLUDED.role,
    perfil_nome = EXCLUDED.perfil_nome,
    banker_name = EXCLUDED.banker_name,
    empresa     = EXCLUDED.empresa,
    short_name  = EXCLUDED.short_name;

  UPDATE user_roles ur
  SET role = p_role::app_role
  FROM profiles p
  WHERE ur.user_id = p.user_id
    AND LOWER(TRIM(p.email)) = LOWER(TRIM(p_email));

  UPDATE profiles SET
    nome_completo = p_nome,
    banker_name   = p_banker_name,
    empresa       = COALESCE(p_empresa, 'Tailor Partners')
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email));

  RETURN json_build_object('success', true, 'message', 'Usuario pre-cadastrado com sucesso.');

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
