

# Ajustar filtro AnoMes — Todos os meses por padrão

## Summary

Change AnoMes filter from a hardcoded 14-month default to an empty array (meaning "all months"). Source options from `vw_dim_anomes_all` ordered desc. Add "Selecionar tudo / Limpar" toggle in sidebar.

## Changes

### 1. `src/hooks/useDashboardFilters.ts`

- Remove `computeDefault14Months` and `default14` constant.
- Set `defaultFilters.anoMes = []`.
- Update `activeChips`: show anoMes chips when `appliedFilters.anoMes.length > 0` (no more comparison to default14).

### 2. `src/hooks/useDashboardData.ts`

- In `useFilterOptions`, change the anoMes query from `vw_dim_anomes` to `vw_dim_anomes_all`, selecting both `anomes` and `anomes_nome`, ordered by `anomes` desc.
- Return `anoMeses` as before (array of string anomes values). The `anomes_nome` can optionally be returned for display.
- Both `buildRpcParams` and `buildRpcParamsPbi` already pass `null` when `anoMes` is empty — no changes needed.

### 3. `src/components/dashboard/FiltersSidebar.tsx`

- In the AnoMes `PbiMultiSelect`, add a "Selecionar tudo / Limpar" toggle button.
- Show placeholder "Todos os meses" when `pendingFilters.anoMes` is empty.
- Add a small helper button above the list: if all selected → "Limpar", else → "Selecionar tudo".

## Files

| File | Action |
|---|---|
| `src/hooks/useDashboardFilters.ts` | Remove 14-month default, set anoMes=[], simplify chips |
| `src/hooks/useDashboardData.ts` | Switch to `vw_dim_anomes_all` |
| `src/components/dashboard/FiltersSidebar.tsx` | Add select all/clear toggle for AnoMes |

