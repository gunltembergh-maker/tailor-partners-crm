
DROP FUNCTION IF EXISTS public.rpc_admin_lista_usuarios();

CREATE FUNCTION public.rpc_admin_lista_usuarios()
RETURNS TABLE(
  id uuid, email text, nome text, role text, blocked boolean, active boolean,
  banker_name text, finder_name text, primeiro_acesso boolean, ultimo_acesso timestamptz,
  invited_at timestamptz, perfil_id uuid, user_id uuid, full_name text, cpf text,
  empresa text, area text, gestor text, advisor_name text, operacao_tipo text,
  finder_id text, pre_cadastrado boolean, tem_conta boolean, created_at timestamptz,
  convite_status text, convite_enviado_em timestamptz, convite_aceito_em timestamptz,
  convite_expira_em timestamptz, convite_cancelado_em timestamptz, convite_reenvios integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT 
    p.id,
    p.email,
    COALESCE(p.nome_completo, p.full_name) AS nome,
    ur.role::text AS role,
    COALESCE(p.blocked, false) AS blocked,
    p.active,
    p.banker_name,
    p.finder_name,
    COALESCE(p.primeiro_acesso, true) AS primeiro_acesso,
    p.ultimo_acesso,
    COALESCE(u.invited_at, tr.convite_enviado_em) AS invited_at,
    p.perfil_id,
    p.user_id,
    p.full_name,
    p.cpf,
    p.empresa,
    p.area,
    p.gestor,
    p.advisor_name,
    p.operacao_tipo,
    p.finder_name AS finder_id,
    CASE WHEN u.id IS NULL THEN true ELSE false END AS pre_cadastrado,
    CASE WHEN u.id IS NOT NULL THEN true ELSE false END AS tem_conta,
    p.created_at,
    tr.convite_status,
    tr.convite_enviado_em,
    tr.convite_aceito_em,
    tr.convite_expira_em,
    tr.convite_cancelado_em,
    tr.convite_reenvios
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.user_id
  LEFT JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN team_reference tr ON LOWER(TRIM(tr.email)) = LOWER(TRIM(p.email))

  UNION ALL

  SELECT 
    tr.id AS id,
    tr.email,
    COALESCE(tr.nome, tr.full_name) AS nome,
    tr.role::text AS role,
    COALESCE(tr.blocked, false) AS blocked,
    false AS active,
    tr.banker_name,
    tr.finder_name,
    true AS primeiro_acesso,
    NULL::timestamptz AS ultimo_acesso,
    tr.convite_enviado_em AS invited_at,
    NULL::uuid AS perfil_id,
    NULL::uuid AS user_id,
    tr.full_name,
    tr.cpf,
    tr.empresa,
    tr.area,
    tr.gestor,
    tr.advisor_name,
    tr.operacao_tipo,
    tr.finder_name AS finder_id,
    true AS pre_cadastrado,
    false AS tem_conta,
    tr.created_at,
    tr.convite_status,
    tr.convite_enviado_em,
    tr.convite_aceito_em,
    tr.convite_expira_em,
    tr.convite_cancelado_em,
    tr.convite_reenvios
  FROM team_reference tr
  WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(tr.email))
  )

  ORDER BY created_at DESC;
$function$;
