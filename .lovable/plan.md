

# Create Gestão de Perfis de Acesso Page

## Files to change
1. **Create** `src/pages/admin/GestaoProfiles.tsx`
2. **Edit** `src/App.tsx` — add route `/admin/perfis`
3. **Edit** `src/components/AppSidebar.tsx` — add "Perfis de Acesso" menu item

## App.tsx changes
- Import `GestaoProfiles` from `./pages/admin/GestaoProfiles`
- Add route: `<Route path="/admin/perfis" element={<ProtectedRoute><GestaoProfiles /></ProtectedRoute>} />`

## AppSidebar.tsx changes
- Import `Shield` icon from lucide-react
- Add `{ title: "Perfis de Acesso", icon: Shield, path: "/admin/perfis" }` to `adminMenuItems` array
- The Admin section already shows only for `role === "ADMIN"` which is sufficient; the `permissoes.menu_perfis_acesso` check would require fetching permissoes in the sidebar — since useAuth doesn't expose permissoes, we keep the existing ADMIN-only gate

## GestaoProfiles.tsx — new page

### Structure
- Wrapped in `<AppLayout>`
- Header with title "Perfis de Acesso", subtitle, and "+ Novo Perfil" button (top right)
- Grid of profile cards (2 cols desktop, 1 col mobile)
- Uses `TailorLoader` while loading

### Data fetching
- `supabase.rpc('rpc_admin_lista_perfis')` via `useQuery`
- Returns `{ id, nome, descricao, permissoes, created_at }`

### Profile Card
Each card tracks local state for `descricao` and `permissoes` toggles. A `modified` flag highlights card border yellow when changes exist.

**Header**: Badge with profile name (color mapped by name: ADMIN=red, LIDER=purple, BANKER=blue, DIRETORIA=orange, RH=green, JURIDICO=gray, MARKETING=pink, default=slate). Editable description input. Trash icon for non-default profiles.

**Section "Menus e Páginas"**: 7 Switch toggles for menu permissions (menu_dashboard_comercial, menu_quantitativo, menu_qualitativo, menu_importar_bases, menu_auditoria, menu_gestao_usuarios, menu_perfis_acesso).

**Section "Dados e Visualização"**: 3 Switch toggles (dados_ver_todos_bankers, dados_filtro_banker, dados_exportar).

**Footer**: "Salvar alterações" button (highlighted when modified). Last update timestamp formatted DD/MM/AAAA HH:MM.

### Actions
- **Save**: `supabase.rpc('rpc_admin_salvar_perfil', { p_id, p_nome, p_descricao, p_permissoes })` → toast success/error, refetch list
- **Create**: Dialog with name (uppercase) + description fields → `supabase.rpc('rpc_admin_criar_perfil', { p_nome, p_descricao })` → refetch
- **Delete**: AlertDialog confirmation → `supabase.rpc('rpc_admin_deletar_perfil', { p_id })` → handle `success: false` with error toast → refetch
- Default profiles (ADMIN, LIDER, BANKER, DIRETORIA) hide delete icon

### Visual
- Dark theme consistent with Hub
- Cards: `bg-card border border-border` with `border-yellow-500/50` when modified
- Switches: green when checked via existing Switch component styling
- Toast via `useToast` for success (green) and error (destructive)

