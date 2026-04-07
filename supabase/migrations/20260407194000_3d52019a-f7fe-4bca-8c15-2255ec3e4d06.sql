
DROP FUNCTION IF EXISTS public.rpc_admin_lista_usuarios();

CREATE OR REPLACE FUNCTION public.rpc_admin_lista_usuarios()
RETURNS TABLE(
  id uuid, email text, nome text, role text,
  blocked boolean, active boolean,
  banker_name text, finder_name text,
  primeiro_acesso boolean, ultimo_acesso timestamptz,
  invited_at timestamptz, perfil_id uuid,
  user_id uuid, full_name text, cpf text,
  empresa text, area text, gestor text,
  advisor_name text, operacao_tipo text,
  finder_id text, pre_cadastrado boolean,
  tem_conta boolean, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $func$
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
    u.invited_at,
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
    p.created_at
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.user_id
  LEFT JOIN auth.users u ON u.id = p.user_id
  ORDER BY p.created_at DESC;
$func$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_lista_usuarios() TO authenticated;

NOTIFY pgrst, 'reload schema';
