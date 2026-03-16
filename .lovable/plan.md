

# Quantitativo — Ajuste PBIX (Partes 3 e 4)

## Summary

Switch AuC, Faixa PL, and Receita sections to new RPCs that match the PBIX layout. Add a `buildRpcParamsPbi` helper that only passes `p_anomes` and `p_banker` (no Documento/Advisor/Finder/TipoCliente) for these blocks. Refactor charts to stacked/100% stacked as needed, and rebuild the Receita Matriz as a hierarchical pivot (Categoria > Subcategoria > Produto > Subproduto).

## Changes

### 1. `src/hooks/useDashboardData.ts`

Add `buildRpcParamsPbi(filters)` — only `p_anomes` + `p_banker`, rest null.

Replace/add hooks:
- `useAucMesStackCasa(filters)` → `rpc_auc_mes_stack_casa` (params: pbi) → `{ anomes, anomes_nome, casa, auc }[]`
- `useAucCasaM0(filters)` → `rpc_auc_casa_m0` (params: pbi) → `{ casa, auc }[]`
- `useFaixaPlClientesMes(filters)` → `rpc_faixa_pl_clientes_mes` (params: pbi) → `{ anomes_nome, faixa_pl, ordem_pl, clientes }[]`
- `useFaixaPlAucMes(filters)` → `rpc_faixa_pl_auc_mes` (params: pbi) → `{ anomes_nome, faixa_pl, ordem_pl, auc }[]`
- `useReceitaTotal(filters)` → `rpc_receita_total` (params: pbi) → `{ receita }` single row
- Update `useReceitaMesCategoria` → use pbi params
- Update `useReceitaTreemapCategoria` → use pbi params
- `useReceitaMatrizRows(filters)` → `rpc_receita_matriz_rows` (params: pbi) → `{ categoria, subcategoria, produto, subproduto, anomes, anomes_nome, valor }[]`

Remove old `useAucMes`, `useAucCasa`, `useFaixaPlClientes`, `useFaixaPlAuc`, `useReceitaKpi`, `useReceitaMatriz`.

### 2. `src/components/dashboard/QuantitativoTab.tsx`

**AuC section (Row 5)**:
- Stacked bar chart (not line) using `useAucMesStackCasa`: pivot by `casa`, X=`anomes_nome`, stacked bars
- Donut: `useAucCasaM0` (M0 only)

**Faixa PL section (Row 6)**:
- 100% stacked bar (vertical) for `# Clientes`: `useFaixaPlClientesMes` — Category=`anomes_nome`, Series=`faixa_pl`, stackOffset="expand"
- 100% stacked bar (vertical) for `AuC`: `useFaixaPlAucMes` — same pattern, stackOffset="expand"
- YAxis format as percentage

**Receita section**:
- Card: `useReceitaTotal` → `receita`
- Stacked bar + Treemap: already correct RPCs, just switch to pbi params
- Matriz: `useReceitaMatrizRows` → frontend pivot:
  - Build tree: Categoria > Subcategoria > Produto > Subproduto
  - Columns = unique `anomes_nome` sorted
  - Exclude `categoria='Outros'`
  - Expandable rows with indentation

## Files

| File | Action |
|---|---|
| `src/hooks/useDashboardData.ts` | Add `buildRpcParamsPbi`, add 5 new hooks, update 2 existing, remove 5 old |
| `src/components/dashboard/QuantitativoTab.tsx` | Rewrite AuC/Faixa PL/Receita sections to match PBIX |

