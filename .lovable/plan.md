

## Plan: Create "Regras de Acesso" Admin Page

### Problem
The RPCs mentioned in the request (`rpc_admin_listar_access_rules`, `rpc_admin_salvar_access_rule`, `rpc_admin_remover_access_rule`) and the `access_rules` table do not exist in the database yet. These must be created first before building the UI.

### Steps

#### 1. Database Migration — Create `access_rules` table and RPCs

Create table `access_rules`:
- `id` UUID PK
- `profile_id` UUID (references profiles, unique)
- `bankers` TEXT[] nullable (null = no restriction)
- `finders` TEXT[] nullable
- `advisors` TEXT[] nullable
- `documentos` TEXT[] nullable (CPFs/CNPJs)
- `canais` TEXT[] nullable
- `descricao` TEXT nullable
- `created_at`, `updated_at` timestamps

RLS: only ADMIN/LIDER can CRUD (using `has_role` pattern).

Create 3 RPCs (SECURITY DEFINER):
- `rpc_admin_listar_access_rules()` — joins `access_rules` with `profiles` to return user name, email, and rule summary
- `rpc_admin_salvar_access_rule(p_profile_id, p_bankers, p_finders, p_advisors, p_documentos, p_canais, p_descricao)` — upsert into `access_rules`
- `rpc_admin_remover_access_rule(p_profile_id)` — delete from `access_rules`

#### 2. Create page `src/pages/admin/RegrasAcesso.tsx`

Following the pattern of `GestaoUsuarios.tsx`:
- Wrapped in `<AppLayout>`
- Fetches user list via `rpc_admin_listar_access_rules`
- Fetches bankers via `rpc_filtro_financial_advisors` and finders via `rpc_filtro_finders`
- Table with columns: Nome, E-mail, Regra atual (badges), Ações
- "Editar regra" button opens a Dialog/Sheet modal
- Modal contains Accordion sections for: Bankers (multi-select chips), Finders (multi-select chips), Clientes Especificos (tag input), Canal/Casa (checkboxes), Descricao (textarea)
- Save calls `rpc_admin_salvar_access_rule`, Remove calls `rpc_admin_remover_access_rule`
- Toast feedback on success/error, query invalidation after save
- "Como funciona?" info card with usage examples

#### 3. Add route in `src/App.tsx`

- Import lazy `RegrasAcesso`
- Add route `/admin/regras-acesso` wrapped in `<AdminRoute>`

#### 4. Add menu item in `src/components/AppSidebar.tsx`

- Add `Key` icon import from lucide-react
- Add entry after "Perfis de Acesso" checking `canSee("menu_regras_acesso")`

#### 5. Add permission key `menu_regras_acesso`

- Add to `PERMISSION_GROUPS` in `GestaoProfiles.tsx` under the Admin group

### Technical Notes
- The `rpc_filtro_financial_advisors` RPC accepts `p_role` param; we'll call it without restriction to get all bankers
- Canal options hardcoded: XP, Avenue, Morgan Stanley, Itau, Gestora
- Null fields mean "no restriction" — UI shows "Todos" option that clears the selection
- ADMIN users bypass permission checks via `canSee` in sidebar

