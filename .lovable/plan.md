

# Two Fixes: Qualitativo as Tab + Data Loading

## Problem 1 — Qualitativo as separate page
The Qualitativo page exists at `/dashboards/qualitativo` as a standalone page but should be a tab inside Dashboard Comercial. It's already rendered as a tab in `DashboardComercial.tsx` (lines 91-100), so we just need to clean up the separate route and menu item.

## Problem 2 — Data not loading
The `useQualitativoData.ts` `buildParams` function passes `p_anomes` to RPCs that don't accept it (custodia, vencimentos, etc.), causing errors. Additionally, `QualitativoTab.tsx` reads `r.net` from custodia/vencimentos RPCs but those RPCs return `total` as the column name.

## Changes

### 1. `src/App.tsx`
- Remove the import of `QualitativoPage`
- Remove the route `/dashboards/qualitativo`

### 2. `src/components/AppSidebar.tsx`
- Remove `{ title: "Qualitativo", ... }` from `dashboardItems` array — it's accessed as a tab inside Comercial

### 3. `src/hooks/useQualitativoData.ts`
Fix `buildParams` to only return parameters each RPC actually accepts. Create separate param builders:
- `buildFilterParams` (no `p_anomes`): for custodia, vencimentos, todos_ativos, tabela_clientes, auc_faixa_pl
- `buildRoaParams`: for ROA RPCs (only `p_banker`, `p_documento`, `p_tipo_cliente`)

Also fix vencimentos hooks to pass `p_vencimento_inicio`/`p_vencimento_fim` as `null` (the RPCs accept these but hooks don't pass them).

### 4. `src/components/dashboard/QualitativoTab.tsx`
Fix field name mappings in `useMemo` blocks:
- `custIdxChart`: `r.net` → `r.total` (RPC returns `total`)
- `custVeiChart`: `r.net` → `r.total`
- `vencGrafChart`: `r.net` → `r.total`
- `aucFaixaChart`: add `ordem_pl` mapping (uses custom sort order from RPC)

No other files changed.

