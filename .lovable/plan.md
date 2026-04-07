

## Plan: Dynamic Accordions for Destinatarios/Paginas + Dynamic Data Sources

### 1. Database Migration

Create `admin_rotas` table, insert initial routes, create `rpc_admin_listar_rotas` RPC, and add RLS policy.

```sql
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
  SELECT rota, nome, ativo FROM admin_rotas WHERE ativo = true ORDER BY nome;
$func$;
```

### 2. Rewrite `GerenciarPopups.tsx` Modal Section

**Remove hardcoded constants**: `PERFIL_OPTIONS` and `PAGINA_OPTIONS`.

**Add 3 new queries**:
- `rpc_admin_listar_rotas()` for dynamic page list
- `perfis_acesso` table (`select nome`) for dynamic profile list  
- `rpc_admin_lista_usuarios` for user list with name + email

**Destinatarios accordion** (collapsible):
- Default: collapsed, showing summary ("Todos os usuários")
- Click to expand, shows radio options (Todos / Por perfil / Usuários específicos)
- When "Por perfil" selected: show dynamic checkboxes from `perfis_acesso`
- When "Usuários específicos": show searchable list with name + email + checkboxes
- Auto-collapse after selection, showing summary like "3 perfis" or "5 usuários"
- Uses Collapsible component from `@/components/ui/collapsible`

**Paginas accordion** (collapsible):
- Default: collapsed, showing summary ("Todas as páginas")
- Click to expand, shows "Todas as páginas" toggle + dynamic checkboxes from `admin_rotas`
- Auto-collapse showing summary like "2 páginas"
- Uses same Collapsible component

**Visual**: ChevronDown icon that rotates when expanded, rounded border, consistent styling.

**Also update `getPaginasLabel`** in the table list to use the fetched rotas data for label resolution instead of hardcoded options.

### Files Changed
- `src/pages/admin/GerenciarPopups.tsx` — replace hardcoded lists with dynamic queries, add accordion UI for destinatarios and paginas
- New migration SQL — create `admin_rotas` table and `rpc_admin_listar_rotas` RPC

