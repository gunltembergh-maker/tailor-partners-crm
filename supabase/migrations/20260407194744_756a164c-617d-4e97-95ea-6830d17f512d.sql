
-- Cascade delete user RPC (re-create since previous migration failed)
CREATE OR REPLACE FUNCTION public.rpc_admin_excluir_usuario(
  p_profile_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM profiles WHERE id = p_profile_id;

  DELETE FROM admin_popup_dismissals WHERE profile_id = p_profile_id;
  DELETE FROM user_access_rules WHERE profile_id = p_profile_id;
  DELETE FROM user_roles WHERE user_id = v_user_id;
  DELETE FROM access_logs WHERE user_id = v_user_id;
  DELETE FROM profiles WHERE id = p_profile_id;

  IF v_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$func$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_excluir_usuario(uuid) TO authenticated;

-- CPF availability check RPC
CREATE OR REPLACE FUNCTION public.rpc_verificar_cpf(p_cpf text, p_exclude_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $func$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM profiles
      WHERE cpf = regexp_replace(p_cpf, '\D', '', 'g')
      AND (p_exclude_id IS NULL OR id != p_exclude_id)
    )
    THEN jsonb_build_object('disponivel', false, 'mensagem', 'Este CPF já está cadastrado no Hub')
    ELSE jsonb_build_object('disponivel', true, 'mensagem', 'CPF válido e disponível')
  END;
$func$;

GRANT EXECUTE ON FUNCTION public.rpc_verificar_cpf(text, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
