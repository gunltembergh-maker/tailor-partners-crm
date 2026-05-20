CREATE OR REPLACE FUNCTION public.rpc_buscar_usuarios_hub(
  p_busca text DEFAULT NULL
)
RETURNS TABLE(
  user_id uuid,
  nome text,
  email text,
  role text,
  empresa text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    COALESCE(NULLIF(p.nome_completo, ''), NULLIF(p.full_name, ''), NULLIF(p.nome, ''), 'Sem nome') AS nome,
    p.email,
    COALESCE(ur.role::text, '') AS role,
    p.empresa
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE p.active = true
    AND COALESCE(p.blocked, false) = false
    AND p.email IS NOT NULL
    AND p.email <> ''
    AND (
      p_busca IS NULL 
      OR p_busca = ''
      OR LOWER(COALESCE(p.nome_completo, p.full_name, p.nome, '')) LIKE LOWER('%' || p_busca || '%')
      OR LOWER(p.email) LIKE LOWER('%' || p_busca || '%')
    )
  ORDER BY 
    CASE COALESCE(ur.role::text, '')
      WHEN 'DIRETORIA' THEN 1
      WHEN 'ADMIN' THEN 2
      WHEN 'LIDER' THEN 3
      WHEN 'BANKER' THEN 4
      ELSE 5
    END,
    2 ASC;
END;
$$;

COMMENT ON FUNCTION public.rpc_buscar_usuarios_hub IS 
'Lista usuários ativos do Hub para seleção como destinatários de email. Aceita busca por nome ou email. Ordena Diretoria/Admin/Líder primeiro.';

GRANT EXECUTE ON FUNCTION public.rpc_buscar_usuarios_hub(text) TO authenticated;