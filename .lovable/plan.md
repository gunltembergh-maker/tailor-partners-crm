

# Quantitativo Parte 2 — Captação via RPCs

## Alterações

### 1. `src/hooks/useDashboardData.ts`
Add 3 new hooks using existing RPCs:
- `useCaptacaoKpis(filters)` → `rpc_captacao_kpis` → returns `{ ref_date, captacao_mtd, captacao_ytd }`
- `useCaptacaoAggMes(filters)` → `rpc_captacao_agg_mes` → returns `{ anomes, anomes_nome, tipo_captacao, valor }[]`
- `useCaptacaoTreemap(filters)` → `rpc_captacao_treemap` → returns `{ tipo_captacao, valor }[]`

All use `buildRpcParams(filters)` already in place.

### 2. `src/components/dashboard/QuantitativoTab.tsx`
- Replace `useCaptacaoData` import with the 3 new hooks.
- **Cards**: Use `useCaptacaoKpis` directly for MTD/YTD values (server-computed `ref_date`).
- **Stacked bar**: Use `useCaptacaoAggMes` — pivot by `tipo_captacao`, use `anomes_nome` for X axis labels.
- **Treemap**: Use `useCaptacaoTreemap` — map `tipo_captacao` → `name`, `valor` → `value`.
- Remove old `captacaoMetrics`, `captacaoPorMesStacked`, `captacaoPorTipo` useMemo blocks.

## Files

| File | Action |
|---|---|
| `src/hooks/useDashboardData.ts` | Add 3 captação RPC hooks |
| `src/components/dashboard/QuantitativoTab.tsx` | Use new hooks, remove old view logic |

