

# Ajustes Visuais + Novos Filtros — QualitativoTab & QuantitativoTab

## Important Note
The filter UI lives in `FiltersSidebar.tsx` and filter options come from `useDashboardData.ts`. To implement PARTE 2 (filter changes), these files also need edits. The plan includes them.

**Files changed:** `QualitativoTab.tsx`, `QuantitativoTab.tsx`, `FiltersSidebar.tsx`, `useDashboardData.ts`

---

## PARTE 1 — Visual Fixes (QualitativoTab.tsx only)

### 1A. ROA M0 Table — revert to simple scroll
- Line 632: Remove `fill` prop from `<PbiCard>`
- Line 633-634: Remove `fill` prop from `<SortableTable>`, set `maxH={300}`

### 1B. Vencimentos bar labels — no "R$"
- Line 570: Change formatter from `fmtMiInt(v)` to `` `${Math.round(v/1e6)}MI` ``

### 1C. AuC bar labels — no "R$"
- Line 516: Change from `` `R$ ${Math.round(v/1e6)} Mi` `` to `` `${Math.round(v/1e6)} Mi` ``
- Line 519: Already shows `${Math.round(v/1e6)} Mi` — keep as-is

### 1D. Move Aplicar/Limpar below Vencimento
This requires editing `FiltersSidebar.tsx`:
- Move the action buttons div (lines 133-153) to AFTER the Vencimento section (after line 166)
- Result order: Ano Mês → Financial Advisor → Documento → Advisor → Tipo de Cliente → Finder → Vencimento → Buttons

---

## PARTE 2 — Filter Changes (FiltersSidebar.tsx + useDashboardData.ts)

### 2A. Ano Mês — use RPC `rpc_filtro_anomes()`
- In `useDashboardData.ts`, update `useFilterOptions` to call `supabase.rpc('rpc_filtro_anomes')` instead of querying `vw_dim_anomes_all`
- Return both `anomes` (int) and `anomes_nome` (text) for display

### 2C. Rename "Documento" → "Documento / Código do Cliente"
- In `FiltersSidebar.tsx`, update label text
- The search field remains a text input; the backend RPC already handles matching

### 2D. Advisor — use RPC `rpc_filtro_advisors()`
- In `useFilterOptions`, call `supabase.rpc('rpc_filtro_advisors')` instead of querying `vw_dim_advisor`

### 2E. Remove Banker filter
- In `FiltersSidebar.tsx`, remove the "Banker" `<PbiMultiSelect>` section (lines 114-120)
- "Financial Advisor" already filters by `banker` column via the `finder` filter key — need to verify this mapping is correct. Currently "Financial Advisor" maps to `pendingFilters.finder` / `p_finder` param. This needs review to ensure it maps to `p_banker`.

### 2F. Finder — use RPC `rpc_filtro_finders()`
- Already exists in filter options, just switch to RPC call

### 2G. Tipo de Cliente — use RPC `rpc_filtro_tipo_cliente()`
- Switch to RPC call in `useFilterOptions`

---

## PARTE 4 — Filter Relationships

The current architecture already passes all filters to all RPCs via `buildFilterParams` / `buildRpcParams`. When the user clicks "Aplicar", `appliedFilters` updates and all hooks re-fetch with the new params. This already works correctly.

No additional changes needed — the "Aplicar" button triggers `setAppliedFilters` which cascades to all `useQuery` hooks via their `queryKey` dependencies.

The "Limpar" button already resets all filters to defaults and triggers re-fetch.

---

## Summary of edits per file

| File | Changes |
|---|---|
| `QualitativoTab.tsx` | Remove fill from ROA M0, fix bar label formats |
| `QuantitativoTab.tsx` | No changes needed (filter flow already works) |
| `FiltersSidebar.tsx` | Remove Banker, rename Documento label, move buttons below Vencimento, add Finder filter if missing |
| `useDashboardData.ts` | Switch filter option queries to RPCs |

