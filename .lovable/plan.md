

# Quantitativo Partes 3 & 4 — AuC, Faixa PL, Receita via RPCs

## Summary

Replace the remaining view-based hooks (`usePositivadorData`, `useReceitaMensalData`, `useReceitaDetalhadaData`) with RPC-based hooks, matching the same pattern used for Contas and Captação.

## Changes

### 1. `src/hooks/useDashboardData.ts` — Add 7 new RPC hooks

All use `buildRpcParams(filters)` already in place:

- `useAucMes(filters)` → `rpc_auc_mes` → `{ anomes, anomes_nome, auc }[]`
- `useAucCasa(filters)` → `rpc_auc_casa` → `{ casa, auc }[]`
- `useFaixaPlClientes(filters)` → `rpc_faixa_pl_clientes` → `{ faixa_pl, ordem_pl, clientes }[]`
- `useFaixaPlAuc(filters)` → `rpc_faixa_pl_auc` → `{ faixa_pl, ordem_pl, auc }[]`
- `useReceitaKpi(filters)` → `rpc_receita_kpi` → `{ receita_total }` (single row)
- `useReceitaMesCategoria(filters)` → `rpc_receita_mes_categoria` → `{ anomes, anomes_nome, categoria, valor }[]`
- `useReceitaTreemapCategoria(filters)` → `rpc_receita_treemap_categoria` → `{ categoria, valor }[]`
- `useReceitaMatriz(filters)` → `rpc_receita_matriz` → `{ documento, anomes, anomes_nome, casa, faixa_pl, auc, receita }[]`

### 2. `src/components/dashboard/QuantitativoTab.tsx` — Replace view hooks with RPC hooks

**Imports**: Replace `usePositivadorData`, `useReceitaMensalData`, `useReceitaDetalhadaData` with the 8 new hooks.

**AuC section (Row 5)**:
- Line chart: use `useAucMes` directly (`anomes_nome` for X, `auc` for Y) — single line, no pivot by casa needed
- Donut: use `useAucCasa` directly (`casa` → name, `auc` → value)
- Remove old `aucPorMesMulti`/`aucCasas`/`aucPorCasa` useMemo blocks

**Faixa PL section (Row 6)**:
- `# Clientes por Faixa PL`: use `useFaixaPlClientes` — horizontal bar sorted by `ordem_pl`
- `AuC por Faixa PL`: use `useFaixaPlAuc` — horizontal bar sorted by `ordem_pl`
- Remove old `clientesFaixaMes`/`faixasPL`/`aucFaixaMes` useMemo blocks

**Receita section (Rows 7-9)**:
- Card: use `useReceitaKpi` for `receita_total`
- Table: use `useReceitaMatriz` for the detailed matrix (documento, anomes, casa, faixa_pl, auc, receita)
- Stacked bar: use `useReceitaMesCategoria` — pivot by `categoria`, X axis `anomes_nome`
- Treemap: use `useReceitaTreemapCategoria` — `categoria` → name, `valor` → value
- Remove old `receitaTotal`/`receitaTabela`/`receitaMeses`/`receitaPorMesStacked`/`receitaCategorias`/`receitaPorCategoria` useMemo blocks

### 3. Cleanup

Remove unused imports of `usePositivadorData`, `useReceitaMensalData`, `useReceitaDetalhadaData` from QuantitativoTab. The old hooks can remain in `useDashboardData.ts` for use by QualitativoTab.

## Files

| File | Action |
|---|---|
| `src/hooks/useDashboardData.ts` | Add 8 RPC hooks |
| `src/components/dashboard/QuantitativoTab.tsx` | Replace view hooks with RPC hooks, simplify useMemo blocks |

