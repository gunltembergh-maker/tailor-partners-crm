

# Auth Overhaul + User Management + Permission-Based Access

## Files to change
1. **Rewrite** `src/pages/Auth.tsx` — enhanced signup form + confirmation screen + blocked message
2. **Create** `src/pages/admin/GestaoUsuarios.tsx` — user management page
3. **Rewrite** `src/pages/admin/GestaoProfiles.tsx` — update toggle keys to match new permission names
4. **Edit** `src/hooks/useAuth.tsx` — add `permissoes`, `bankerName`, blocked check via `rpc_meu_perfil`
5. **Edit** `src/components/AppSidebar.tsx` — permission-based menu visibility + add "Usuarios" item
6. **Edit** `src/App.tsx` — add `/admin/usuarios` route

---

## PARTE 1 — Auth.tsx Rewrite

### Login mode
- Same as current but add `?blocked=true` check from URL params: show red alert "Seu acesso foi revogado. Entre em contato com o administrador."
- Footer: "Acesso restrito a Colaboradores Grupo Tailor Partners © 2026"

### Signup mode — new fields
1. **Nome Completo** (min 3 chars)
2. **E-mail Corporativo** (validate `@tailorpartners.com.br`)
3. **CPF** with mask `000.000.000-00` — validate digits algorithm, on blur check `profiles` table for uniqueness
4. **Empresa** (default "Tailor Partners", editable)
5. **Senha** (min 8 chars) with strength indicator (weak/medium/strong bar)
6. **Confirmar Senha** (must match)

### Signup submit
- Call `signUp` with `options.data: { nome_completo, cpf (digits only), empresa }`
- Update `signUp` in useAuth to accept these new fields
- After success, show confirmation screen (not redirect) with email sent message + "Reenviar e-mail" button using `supabase.auth.resend({ type: 'signup', email })`

### CPF validation
- Mask input: format as user types `000.000.000-00`
- Validate 11 digits + verifier algorithm
- On blur: `supabase.from('profiles').select('id').eq('cpf', cpfDigits).limit(1)` — if found, show error

---

## PARTE 2 — GestaoUsuarios.tsx (new)

### Layout
- `AppLayout` wrapper, title "Gestão de Usuários"
- 4 metric cards at top (total, active 30d, awaiting, blocked) — computed from RPC data
- Search bar + status filter (Todos/Ativo/Aguardando/Bloqueado) + profile filter dropdown + "+ Pré-cadastrar" button
- Table with columns: Nome, E-mail, CPF (masked with reveal toggle), Empresa, Perfil (colored badge), Banker Vinculado, Status (colored), Último Acesso (relative), Cadastrado em, Ações

### Data
- Fetch via `supabase.rpc('rpc_admin_lista_usuarios')`
- Client-side filtering by search term and status/profile filters

### Actions
- **Edit**: modal with Nome, Email, Perfil dropdown (from `rpc_admin_lista_perfis`), Banker Vinculado (conditional on BANKER profile), Empresa
- **Block/Unblock**: AlertDialog confirmation → `rpc_admin_bloquear_usuario({ p_email, p_blocked })`
- **Delete**: only for "Aguardando" status → `rpc_admin_remover_precadastro({ p_email })`
- **Pre-register**: same modal as Edit but for new user → `rpc_admin_salvar_usuario({ p_email, p_nome, p_role, p_perfil_nome, p_banker_name, p_empresa })`

### Banker list (hardcoded)
Adonias Noronha, Caroline Vlavianos, Felipe Steiman, Gestora, Legado, Leonardo Burle, Raphael Farias, Raphael Pereira, Sem Advisor, Thayane Freitas

---

## PARTE 3 — GestaoProfiles.tsx update

Minimal changes — the existing page already works well. Just update the toggle keys to include `admin_usuarios` and `admin_perfis` (mapping from `menu_gestao_usuarios`/`menu_perfis_acesso`). Keep existing structure.

---

## PARTE 4 — useAuth.tsx changes

### New context fields
```typescript
interface AuthContextType {
  // ... existing
  permissoes: Record<string, boolean> | null;
  bankerName: string | null;
}
```

### After session established
Replace `fetchProfile` + `fetchRole` with a single `rpc_meu_perfil` call:
```typescript
const { data: perfil } = await supabase.rpc('rpc_meu_perfil');
// Returns: user_id, email, nome, role, perfil_nome, banker_name, blocked, permissoes
```

- If `perfil.blocked === true` → signOut + redirect to `/auth?blocked=true`
- Set `role = perfil.role`, `permissoes = perfil.permissoes`, `bankerName = perfil.banker_name`
- Keep `profile` object populated from the same RPC data (full_name, email, avatar_url fallback)

### signUp update
Accept `nomeCompleto`, `cpf`, `empresa` params instead of just `fullName`.

---

## PARTE 5 — AppSidebar.tsx changes

### Permission-based visibility
Replace static `role === "ADMIN"` checks with `permissoes` from useAuth:

- Main menu items: visible when `isAdmin || isLider` (keep existing)
- Dashboard Comercial: always visible (or `permissoes?.menu_dashboard_comercial`)
- Admin section: show if ANY admin permission is true
  - "Importar Bases" → `permissoes?.menu_importar_bases`
  - "Auditoria Comercial" → `permissoes?.menu_auditoria`
  - "Usuários" → `permissoes?.menu_gestao_usuarios` (new item, Users icon, `/admin/usuarios`)
  - "Perfis de Acesso" → `permissoes?.menu_perfis_acesso`

---

## PARTE 6 — App.tsx route addition

Add import for `GestaoUsuarios` and route:
```tsx
<Route path="/admin/usuarios" element={<ProtectedRoute><GestaoUsuarios /></ProtectedRoute>} />
```

---

## Technical notes
- CPF mask: handle onChange to insert dots/dash as user types
- Password strength: check length >= 12 (strong), >= 8 with mixed case + number (medium), else weak
- All new pages use `TailorLoader` during loading
- Toast notifications for all actions
- No changes to QuantitativoTab or QualitativoTab

