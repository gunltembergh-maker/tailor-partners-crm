
DROP FUNCTION IF EXISTS public.rpc_registrar_convite(text, text);

CREATE OR REPLACE FUNCTION public.rpc_registrar_convite(
  p_email text,
  p_acao text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref_id uuid;
BEGIN
  IF NOT is_admin_or_lider(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Acesso negado');
  END IF;

  SELECT id INTO v_ref_id FROM team_reference WHERE email = p_email;
  IF v_ref_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Usuário não encontrado');
  END IF;

  IF p_acao = 'enviado' OR p_acao = 'reenvio' THEN
    UPDATE team_reference SET
      convite_status = 'enviado',
      convite_enviado_em = now(),
      convite_expira_em = now() + interval '2 hours',
      convite_cancelado_em = NULL,
      convite_reenvios = CASE WHEN p_acao = 'reenvio' THEN COALESCE(convite_reenvios, 0) + 1 ELSE COALESCE(convite_reenvios, 0) END
    WHERE id = v_ref_id;
  ELSIF p_acao = 'cancelado' THEN
    UPDATE team_reference SET
      convite_status = 'cancelado',
      convite_cancelado_em = now()
    WHERE id = v_ref_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
