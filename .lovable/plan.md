

# Rewrite QualitativoTab.tsx — Full Overhaul

## Summary
Complete rewrite of `src/components/dashboard/QualitativoTab.tsx` with new section ordering, formatting, chart configurations, and a new `rpc_vencimentos_por_ano` hook. Also add one new hook to `src/hooks/useQualitativoData.ts`.

**Only files changed:** `QualitativoTab.tsx` and `useQualitativoData.ts` (new hook only).

## Changes

### 1. `src/hooks/useQualitativoData.ts` — Add `useVencimentosPorAno` hook
Add a new exported hook that calls `rpc_vencimentos_por_ano` with the same filter params + vencimento dates (all null by default).

### 2. `src/components/dashboard/QualitativoTab.tsx` — Full rewrite

**Formatting functions** (pt-BR throughout):
- `formatPct(v)` → `"0,13%"` (comma decimal)
- `formatMi(v)` → `"R$ 897,89 Mi"` (comma decimal)
- `formatBRL(v)` → `"R$ 1.248.820,00"` (dot thousands, comma decimal, NO Mi/Bi)
- `formatD0(v)` → number with 2 decimal places, comma separator

**Section order** (top to bottom):
1. **Tabela CLIENTES** — columns: Documento | Conta (cod_cliente) | Saldo D0 (d0) | 1º Nome | PL Tailor | PL Declarado | SoW | Endereço | Banker | Advisor | Tipo. PL/D0 as `formatBRL`, SoW as `formatPct`. Footer row with sums/avg. Pagination 50 items. Search box. Default sort: PL Tailor desc. Min-width 150px per column, horizontal scroll.
2. **AuC por Faixa de PL** — Grouped bars (Net Em M #1a2e4a + PL Declarado #6bb8d4) + Line (# Clientes #4a90d9, right Y axis). Labels on top of bars (Mi). Client count labels on line points. Legend top-left. X order: Inativo → +10M.
3. **Custódia** — 2-col grid: Indexador (left) + Veículo (right). Donuts with external labels + connector lines showing "Name R$ XX Mi (XX%)". Legend right side. Clean, no overlap.
4. **ROA por Tipo de Cliente** — Single LineChart with 2 series (PF #1a2e4a, PJ #4caf50). Labels on each point. Y axis "0,XX%" format. Legend top-left. White background, dashed grid.
5. **ROA por Faixa de PL** — Single LineChart with series per faixa. Colors: -300k:#1a2e4a, 300k-500k:#e8a838, 500k-1M:#4a90d9, 1-3M:#e74c3c, 3-5M:#27ae60, 5-10M:#7f8c8d, +10M:#8e44ad. Same style as above.
6. **ROA M0 Table** — Documento, Faixa PL, ROA (formatPct).
7. **Vencimentos por Ano** — NEW stacked bar chart from `rpc_vencimentos_por_ano`. X = year, stacked by produto_ajustado. Total label on top. Product colors as specified. Legend top.
8. **Todos os Ativos** — Columns: Documento | Conta | Ativo Ajustado | NET | Indexador | Veículo | Casa | Banker | Advisor | Finder | Tipo | Vencimento. NET as formatBRL, Vencimento as DD/MM/AAAA. Min 150px cols, horizontal scroll.
9. **Vencimentos Detalhado** — Columns: Produto | Ativo | Indexador | Casa | Banker | Advisor | Finder | Documento | Vencimento | NET. Same formatting. Min 150px cols, horizontal scroll.

**SortableTable enhancements:**
- Add `minColWidth` prop (default 150px) applied via `min-width` on each th/td
- Add pagination (50 items) with Anterior/Próximo buttons
- Add search box (for Clientes table: by nome/documento)
- Add optional footer row for totals
- Visible horizontal scrollbar

**ROA charts** — Merge PF/PJ into one chart with 2 lines instead of 2 separate charts. Sort months oldest→newest (by `anomes` numeric sort). Use `LabelList` or custom label to show value on each point.

**Remove** the NPS placeholder section.

## Technical details

| Area | Detail |
|---|---|
| New hook | `useVencimentosPorAno(filters)` in `useQualitativoData.ts` |
| Donut labels | Use Recharts `label` prop with custom render function for external positioning with connector lines |
| Bar labels | Use `<LabelList>` component from recharts on Bar/Line elements |
| Date formatting | `new Date(v).toLocaleDateString('pt-BR')` for DD/MM/AAAA |
| Pagination | Local state `page` with `sorted.slice((page-1)*50, page*50)` |
| Search | Local state `search` filtering rows before sort/paginate |
| Footer totals | Computed via `rows.reduce()` rendered as a sticky footer row |

