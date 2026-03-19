

# Fix YTD card + Auth/Permissions explanation

## 1. Fix Captação Líq. YTD card (line 458)

When `clickedMonth` is active, show `captacao_mtd` instead of `captacao_ytd` — a simple frontend change on line 458:

```tsx
<MetricCard 
  title={clickedMonth ? `Captação Líq. ${monthLabel}` : "Captação Líq. YTD"} 
  value={fmtKpi(clickedMonth ? (captKpis?.captacao_mtd??0) : (captKpis?.captacao_ytd??0))} 
  icon={TrendingUp}
/>
```

This way:
- `clickedMonth = null` → label "Captação Líq. YTD", value = `captacao_ytd` (accumulated year)
- `clickedMonth` active → label "Captação Líq. [mês]", value = `captacao_mtd` (that month only)

No RPC or other file changes needed.

---

## 2. Auth & Permissions architecture (research answer)

**Authentication**: Managed in `src/hooks/useAuth.tsx`. It wraps Supabase Auth, provides `signIn`, `signUp`, `signOut`, and exposes `session`, `user`, `profile`, and `role` via React Context.

**Roles**: Stored in a `user_roles` table (enum: ADMIN, LIDER, BANKER, FINDER, ASSESSOR). A `has_role()` security-definer function is used for RLS policies. Auto-assignment happens via the `handle_new_user()` trigger for known emails in `team_reference`.

**Sidebar / menu**: `src/components/AppSidebar.tsx` renders the navigation. Admin menu items (Importar Bases, Auditoria Comercial) are conditionally shown only when `role === "ADMIN"`.

**Route protection**: `src/App.tsx` uses a `ProtectedRoute` wrapper that redirects unauthenticated users to `/auth`. There is no per-route role check — all authenticated users can access all routes; only the sidebar visibility differs.

**"View As" feature**: `src/contexts/ViewAsContext.tsx` lets ADMIN/LIDER users impersonate other team members' data views.

