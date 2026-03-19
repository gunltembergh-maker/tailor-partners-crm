

# Adjust sidebar menu visibility by role

## Change: `src/components/AppSidebar.tsx`

Add role-derived booleans and conditionally render menu sections:

```tsx
const isAdmin = role === "ADMIN";
const isLider = role === "LIDER";
const showMainMenu = isAdmin || isLider;
```

- **Menu group** (Início, Prioridades, Leads, etc.): wrap with `{showMainMenu && ...}`
- **Dashboards group** (Comercial): always visible — no change
- **Admin group** (Importar Bases, Auditoria Comercial): already gated by `role === "ADMIN"` — no change

This ensures:
- **ADMIN**: sees everything (Menu + Dashboards + Admin)
- **LIDER**: sees Menu + Dashboards (no Admin)
- **Others** (BANKER, FINDER, ASSESSOR): sees only Dashboards > Comercial

No changes to auth, routes, or any other file.

