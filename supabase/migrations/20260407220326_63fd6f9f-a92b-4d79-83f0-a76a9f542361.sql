
-- Ensure user_roles has unique constraint on user_id
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

-- RPC to update user profile
CREATE OR REPLACE FUNCTION public.rpc_admin_atualizar_usuario(
  p_profile_id  uuid,
  p_nome        text DEFAULT NULL,
  p_email       text DEFAULT NULL,
  p_perfil_id   uuid DEFAULT NULL,
  p_banker_name text DEFAULT NULL,
  p_finder_name text DEFAULT NULL,
  p_advisor_name text DEFAULT NULL,
  p_blocked     boolean DEFAULT NULL,
  p_area        text DEFAULT NULL,
  p_gestor      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_user_id uuid;
  v_role text;
BEGIN
  SELECT user_id INTO v_user_id FROM profiles WHERE id = p_profile_id;

  UPDATE profiles SET
    nome_completo = COALESCE(p_nome, nome_completo),
    full_name     = COALESCE(p_nome, full_name),
    email         = COALESCE(p_email, email),
    perfil_id     = COALESCE(p_perfil_id, perfil_id),
    banker_name   = p_banker_name,
    finder_name   = p_finder_name,
    advisor_name  = p_advisor_name,
    blocked       = COALESCE(p_blocked, blocked),
    area          = COALESCE(p_area, area),
    gestor        = COALESCE(p_gestor, gestor),
    updated_at    = now()
  WHERE id = p_profile_id;

  IF p_perfil_id IS NOT NULL THEN
    SELECT nome INTO v_role FROM perfis_acesso WHERE id = p_perfil_id;
    IF v_user_id IS NOT NULL AND v_role IS NOT NULL THEN
      INSERT INTO user_roles(user_id, role)
      VALUES (v_user_id, v_role::app_role)
      ON CONFLICT (user_id) DO UPDATE SET role = v_role::app_role;
    END IF;
  END IF;

  IF p_email IS NOT NULL AND v_user_id IS NOT NULL THEN
    UPDATE auth.users SET email = p_email WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$func$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_atualizar_usuario(uuid,text,text,uuid,text,text,text,boolean,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_atualizar_usuario(uuid,text,text,uuid,text,text,text,boolean,text,text) TO service_role;

NOTIFY pgrst, 'reload schema';
