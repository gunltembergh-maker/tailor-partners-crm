
CREATE OR REPLACE FUNCTION public.rpc_buscar_usuarios_hub(p_busca text DEFAULT NULL::text)
RETURNS TABLE(user_id uuid, nome text, email text, role text, empresa text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  -- 1) Perfis reais (incluindo pré-cadastrados / inativos), excluindo apenas bloqueados
  SELECT
    p.user_id,
    COALESCE(NULLIF(p.nome_completo, ''), NULLIF(p.full_name, ''), NULLIF(p.nome, ''), 'Sem nome') AS nome,
    p.email,
    COALESCE(ur.role::text, '') AS role,
    p.empresa
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
  LEFT JOIN public.perfis_acesso pa ON pa.nome = COALESCE(ur.role::text, '')
  WHERE COALESCE(p.blocked, false) = false
    AND p.email IS NOT NULL AND p.email <> ''
    AND (ur.role IS NULL OR pa.ativo IS NOT FALSE)
    AND NOT EXISTS (
      SELECT 1 FROM public.suppressed_emails se WHERE LOWER(se.email) = LOWER(p.email)
    )
    AND (
      p_busca IS NULL OR p_busca = ''
      OR LOWER(COALESCE(p.nome_completo, p.full_name, p.nome, '')) LIKE LOWER('%' || p_busca || '%')
      OR LOWER(p.email) LIKE LOWER('%' || p_busca || '%')
      OR (p.cpf IS NOT NULL AND regexp_replace(p.cpf, '\D', '', 'g') LIKE '%' || regexp_replace(COALESCE(p_busca,''), '\D', '', 'g') || '%' AND regexp_replace(COALESCE(p_busca,''), '\D', '', 'g') <> '')
    )

  UNION ALL

  -- 2) Pré-cadastrados em team_reference sem profile correspondente
  SELECT
    tr.id AS user_id,
    COALESCE(NULLIF(tr.full_name, ''), NULLIF(tr.nome, ''), 'Sem nome') AS nome,
    tr.email,
    COALESCE(tr.role::text, '') AS role,
    tr.empresa
  FROM public.team_reference tr
  LEFT JOIN public.perfis_acesso pa ON pa.nome = COALESCE(tr.role::text, '')
  WHERE COALESCE(tr.blocked, false) = false
    AND tr.email IS NOT NULL AND tr.email <> ''
    AND (tr.role IS NULL OR pa.ativo IS NOT FALSE)
    AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE LOWER(p.email) = LOWER(tr.email))
    AND NOT EXISTS (
      SELECT 1 FROM public.suppressed_emails se WHERE LOWER(se.email) = LOWER(tr.email)
    )
    AND (
      p_busca IS NULL OR p_busca = ''
      OR LOWER(COALESCE(tr.full_name, tr.nome, '')) LIKE LOWER('%' || p_busca || '%')
      OR LOWER(tr.email) LIKE LOWER('%' || p_busca || '%')
      OR (tr.cpf IS NOT NULL AND regexp_replace(tr.cpf, '\D', '', 'g') LIKE '%' || regexp_replace(COALESCE(p_busca,''), '\D', '', 'g') || '%' AND regexp_replace(COALESCE(p_busca,''), '\D', '', 'g') <> '')
    )

  ORDER BY 2 ASC
  LIMIT 50;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_buscar_usuarios_hub(text) TO authenticated;
