CREATE OR REPLACE FUNCTION public.rpc_inicio_comunicados_ativos()
RETURNS TABLE(
  id uuid,
  titulo text,
  mensagem text,
  cor_fundo text,
  cor_texto text,
  botao_label text,
  logo_url text,
  mostrar_nome_hub boolean,
  data_inicio timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
BEGIN
  v_user_id := auth.uid();

  SELECT ur.role::text INTO v_user_role
  FROM user_roles ur
  WHERE ur.user_id = v_user_id
  LIMIT 1;

  RETURN QUERY
  SELECT
    p.id,
    p.titulo,
    p.mensagem,
    COALESCE(p.cor_fundo, '#082537') AS cor_fundo,
    COALESCE(p.cor_texto, '#FFFFFF') AS cor_texto,
    COALESCE(p.botao_label, 'Entendido!') AS botao_label,
    p.logo_url,
    COALESCE(p.mostrar_nome_hub, true) AS mostrar_nome_hub,
    p.data_inicio
  FROM public.admin_popups p
  WHERE p.ativo = true
    AND (p.data_inicio IS NULL OR p.data_inicio <= now())
    AND (p.data_fim IS NULL OR p.data_fim >= now())
    AND (
      p.perfis IS NULL
      OR array_length(p.perfis, 1) IS NULL
      OR (v_user_role IS NOT NULL AND v_user_role = ANY(p.perfis))
    )
    AND (
      p.destinatarios IS NULL
      OR array_length(p.destinatarios, 1) IS NULL
      OR v_user_id::text = ANY(p.destinatarios)
    )
  ORDER BY p.data_inicio DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_inicio_comunicados_ativos() TO authenticated;