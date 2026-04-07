
CREATE TABLE IF NOT EXISTS public.admin_rotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rota text NOT NULL UNIQUE,
  nome text NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_rotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read admin_rotas" ON public.admin_rotas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manage admin_rotas" ON public.admin_rotas
  FOR ALL TO authenticated
  USING (is_admin_or_lider(auth.uid()))
  WITH CHECK (is_admin_or_lider(auth.uid()));

INSERT INTO admin_rotas(rota, nome) VALUES
  ('/dashboards/comercial', 'Dashboard Comercial'),
  ('/admin/usuarios', 'Gestão de Usuários'),
  ('/admin/importar-bases', 'Importar Bases'),
  ('/admin/perfis-acesso', 'Perfis de Acesso'),
  ('/admin/regras-acesso', 'Regras de Acesso'),
  ('/admin/popups', 'Comunicados')
ON CONFLICT (rota) DO NOTHING;

CREATE OR REPLACE FUNCTION public.rpc_admin_listar_rotas()
RETURNS TABLE(rota text, nome text, ativo boolean)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $func$
  SELECT r.rota, r.nome, r.ativo FROM admin_rotas r WHERE r.ativo = true ORDER BY r.nome;
$func$;

GRANT ALL ON admin_rotas TO authenticated;

NOTIFY pgrst, 'reload schema';
