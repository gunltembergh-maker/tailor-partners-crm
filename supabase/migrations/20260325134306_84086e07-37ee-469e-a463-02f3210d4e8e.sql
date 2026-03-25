
CREATE OR REPLACE FUNCTION public.rpc_admin_lista_usuarios()
RETURNS TABLE (
  email text,
  nome text,
  cpf text,
  empresa text,
  perfil_nome text,
  banker_name text,
  blocked boolean,
  ultimo_acesso timestamptz,
  created_at timestamptz,
  status text,
  user_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.email,
    COALESCE(p.nome_completo, p.full_name) AS nome,
    p.cpf,
    p.empresa,
    pa.nome AS perfil_nome,
    p.banker_name,
    COALESCE(p.blocked, false) AS blocked,
    p.ultimo_acesso,
    p.created_at,
    CASE
      WHEN COALESCE(p.blocked, false) THEN 'Bloqueado'
      WHEN ur.role IS NOT NULL THEN 'Ativo'
      ELSE 'Aguardando'
    END AS status,
    p.user_id
  FROM profiles p
  LEFT JOIN perfis_acesso pa ON p.perfil_id = pa.id
  LEFT JOIN user_roles ur ON p.user_id = ur.user_id

  UNION ALL

  SELECT
    tr.email,
    COALESCE(tr.nome, tr.full_name) AS nome,
    NULL AS cpf,
    tr.empresa,
    tr.perfil_nome,
    tr.banker_name,
    COALESCE(tr.blocked, false) AS blocked,
    NULL AS ultimo_acesso,
    tr.created_at,
    'Aguardando' AS status,
    NULL::uuid AS user_id
  FROM team_reference tr
  WHERE tr.email IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM profiles p WHERE lower(p.email) = lower(tr.email)
    )
$$;
