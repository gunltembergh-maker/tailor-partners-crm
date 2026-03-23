

# Standalone Qualitativo Page

## Summary

Create a standalone page at `/dashboards/qualitativo` that reuses the existing `QualitativoTab` component from `src/components/dashboard/QualitativoTab.tsx`, wrapped in a page layout with its own filter sidebar. The existing `QualitativoTab` already implements all 7 sections (Custodia donuts, Clientes table, ROA charts, ROA M0 table, AuC Faixa PL combo, Vencimentos, Todos os Ativos) using the hooks from `useQualitativoData.ts`. The page wrapper will add enhanced filters (date range for vencimento, search by nome/documento) and pagination for tables.

## Files to change

### 1. Create `src/pages/QualitativoPage.tsx`
Page wrapper that includes:
- `AppLayout` for the sidebar navigation
- Its own `FiltersSidebar` (reusing existing component with `showVencimento=true`)
- Filter chips display (same pattern as DashboardComercial)
- Header with "Dashboard Qualitativo" title
- Renders `<QualitativoTab filters={appliedFilters} />` as the main content
- Uses `useDashboardFilters` hook for filter state management

### 2. Edit `src/App.tsx`
- Add import for `QualitativoPage`
- Add route: `/dashboards/qualitativo` → `<ProtectedRoute><QualitativoPage /></ProtectedRoute>`

### 3. Edit `src/components/AppSidebar.tsx`
- Add `{ title: "Qualitativo", icon: BarChart3, path: "/dashboards/qualitativo" }` to `dashboardItems` array (visible to all roles)

## Architecture notes

- The existing `QualitativoTab` component already handles all data fetching, charts, and tables via the `useQualitativoData.ts` hooks
- The existing `FiltersSidebar` already supports vencimento filter when `showVencimento=true`
- The existing `useDashboardFilters` hook already manages all filter state including vencimento
- The page follows the exact same pattern as `DashboardComercial.tsx` but renders only the Qualitativo content (no tabs needed)
- Enhanced features like pagination and search within tables would require modifications to the `QualitativoTab` component itself, which is out of scope per "Não altere nenhum outro componente" — the current `SortableTable` and data display will be preserved as-is

| File | Change |
|---|---|
| `src/pages/QualitativoPage.tsx` | Create — page wrapper with filters + QualitativoTab |
| `src/App.tsx` | Add route `/dashboards/qualitativo` |
| `src/components/AppSidebar.tsx` | Add "Qualitativo" to dashboardItems |

