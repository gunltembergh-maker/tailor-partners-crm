

# Rewrite QualitativoTab.tsx — PBI-Identical Layout

## Summary
Full rewrite of `src/components/dashboard/QualitativoTab.tsx` to match the Power BI PDF layout exactly. No other files changed.

## Key Changes

### Formatting helpers
Replace current helpers with:
- `fmtPct(v)` → `"0,13%"` (comma)
- `fmtMiInt(v)` → `"R$ 41 Mi"` (integer, no decimals)
- `fmtMi(v)` → `"R$ 897,89 Mi"` (2 decimals, comma)
- `fmtBRL(v)` → `"R$ 1.248.820,00"` (full currency)
- `fmtBRLint(v)` → `"R$ 1.248.820"` (no decimals)

### SortableTable overhaul
- Remove pagination buttons entirely — use fixed height + `overflow-y: auto` scroll
- Add sticky header via `position: sticky; top: 0; z-index: 10` on `<thead>`
- Keep horizontal scroll (`overflow-x: auto`) with min-width 140px per column
- Keep search box and sort functionality
- Support optional footer row for totals

### Section order (top to bottom)
1. **Tabela CLIENTES** — columns: Documento | Conta | Saldo D0 | 1º Nome | PL Tailor | PL Declarado | SoW | Endereço | Banker | Advisor | Tipo. Footer: sum PL Tailor, sum PL Declarado, avg SoW. Height ~300px scroll. No pagination.
2. **AuC por Faixa de PL** — grouped bars + line. Bar labels: `fmtMiInt` (no decimals). Line labels: integer. Legend top-left.
3. **Custódia** — 2-col grid. Donut labels INSIDE/ON fatia (not external with connectors). Format: `"R$ XXX Mi (XX%)"`. Legend right side with colored squares.
4. **Todos os Ativos** — columns: Documento | Conta | Ativo Ajustado | NET | Indexador | Veículo | Casa | Banker | Advisor | Tipo. NET as `fmtBRLint` (no decimals). Height ~300px scroll.
5. **Vencimentos** (stacked bar by year) — total label on top as `fmtMiInt` (integer). Product colors as specified. Legend top.
6. **Vencimentos Detalhado** — columns: Documento | Ativo | NET | Vencimento | Indexador | Veículo | Banker | Advisor. Footer: sum NET. Date: DD/MM/AA. Height ~300px scroll.
7. **ROA + ROA M0 side by side** — ROA Tipo Cliente line chart (65%) + ROA M0 table (35%). ROA chart: X axis labels every 6 months (`jan 2026`, `jul 2025`), most recent on LEFT (descending order). Labels on each point. White background. Dashed vertical grid. ROA M0 table: Documento | ROA | Faixa PL. Footer: weighted ROA total.
8. **ROA Faixa PL** (full width) — same chart style as ROA Tipo. 6-month X ticks, descending order, labels on points.

### Donut changes
- Remove external labels with connector lines
- Use Recharts `label` prop with custom render to place text ON or near each slice: `"R$ XXX Mi (XX%)"`
- Keep right-side legend with colored squares

### ROA chart X-axis logic
- Sort data by `anomes` descending (most recent first = left)
- Show tick labels only for Jan and Jul: format `"jan AAAA"`, `"jul AAAA"`
- Use `interval={0}` with custom tick filter to skip non-Jan/Jul months
- Dashed vertical grid lines at 6-month intervals
- White/light background inside chart area

### Vencimentos stacked bar
- Use `fmtMiInt` for total label on top (integer, e.g. "R$ 41 Mi")
- Only render years that have data
- Product colors as specified (remove Previdência/Fundos from palette, keep only 9 products listed)

### Vencimentos Detalhado table
- Different column set from current: Documento | Ativo | NET | Vencimento | Indexador | Veículo | Banker | Advisor
- Footer row with NET sum
- Date format: DD/MM/AA (2-digit year)

| Section | Height | Pagination | Footer |
|---|---|---|---|
| Clientes | 300px | No | Sum PL, avg SoW |
| Todos os Ativos | 300px | No | No |
| Vencimentos Det. | 300px | No | Sum NET |
| ROA M0 | 200px | No | Weighted ROA |

