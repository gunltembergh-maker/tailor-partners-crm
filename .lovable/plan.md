

# Apply 12 visual/UX adjustments to QuantitativoTab

## Summary
Apply all adjustments from the uploaded prompt to `src/components/dashboard/QuantitativoTab.tsx` without changing existing filter/banker logic.

## Changes (single file: `QuantitativoTab.tsx`)

### 1. Contas chart — subtitle
Add `<p className="text-[9px] text-gray-400">Total - Últimos 12 meses</p>` inside the `PbiCard` header for "Contas". *(The 12-month filtering logic via `contasMeses` is already implemented.)*

### 2. KPI Captação values — dot decimal
Change `fmtKpi` to use `.` instead of `,` as decimal separator:
```ts
if (abs >= 1e6) return `R$ ${(v/1e6).toFixed(2)} Mi`;
```

### 3. Captação por Mês — 12-month default filter
Add `captMeses` useMemo (same pattern as `contasMeses`) and feed it into `captacaoPorMes` memo instead of raw `captAggMes`.

### 4. Treemap "Tipo de Captação" — interactive legend
Add a `selectedCaptTipo` state. Render a legend below the treemap with colored squares + chevron icons. When clicked, filter `captacaoPorTipo` to that category. Show "all" by default.

### 5. AuC por Mês — 12-month default filter
Add `aucMeses` useMemo (same pattern) and feed into `aucPorMes` memo instead of raw `aucStackCasa`.

### 6. AuC por Casa donut
- Remove "(M0)" from title → `"AuC por Casa"`
- Change label to show all slices with outer label lines using `labelLine={true}` and an external label renderer showing `name (XX.X%)` for all visible slices (remove `percent < 0.03` filter or lower threshold).

### 7. # de Cliente por Faixa de PL → AreaChart
- Import `AreaChart, Area` from recharts
- Replace `BarChart stackOffset="expand"` with `AreaChart` showing real quantities
- Use specific faixa colors: `Inativo:#1a1a2e, -300k:#e8a838, 300k-500k:#4a90d9, 500k-1M:#c0392b, 1-3M:#27ae60, 3-5M:#16a085, 5-10M:#7f8c8d, +10M:#8e44ad`
- Add `LabelList` for values, legend on top
- Add 12-month default filter via `faixaCliMeses` memo

### 8. AuC por Faixa de PL → AreaChart
- Same transformation as #7: `AreaChart` with real values (R$)
- Tooltip shows faixa name + R$ value + % of total
- Same faixa colors, legend on top
- 12-month default filter via `faixaAucMeses` memo

### 9. KPI Receita Bruta Tailor
- Already uses `fmtKpi` — will be fixed by the dot-decimal change in #2

### 10. Tabela Receita Bruta Tailor
- Already shows all categories, all months, total row, expand/collapse — no changes needed per current code review (already matches requirements)

### 11. Receita Bruta stacked bar chart — 12-month filter
Add `receitaMeses` memo and feed into `receitaPorMes`. Add top-bar total labels (already present). Add specific category colors map.

### 12. Treemap Comissão Bruta — interactive legend
Same pattern as #4: add `selectedReceitaCat` state, render legend with chevrons for category filtering.

## New imports
Add `AreaChart, Area` to the recharts import line.

## New constants
```ts
const FAIXA_COLORS: Record<string,string> = {
  "Inativo":"#1a1a2e","-300k":"#e8a838","300k-500k":"#4a90d9",
  "500k-1M":"#c0392b","1-3M":"#27ae60","3-5M":"#16a085",
  "5-10M":"#7f8c8d","+10M":"#8e44ad",
};
const RECEITA_COLORS: Record<string,string> = {
  "Assessoria":"#1f4e79","Câmbio":"#2980b9","Consórcio":"#e67e22",
  "Benefícios":"#8e44ad","Garantia":"#e74c3c","Seguro de Vida":"#c0392b",
  "Offshore":"#16a085","Wealth Solutions":"#27ae60","Demais Ramos":"#95a5a6",
  "Consultoria":"#f39c12","Corporate & Banking":"#7f8c8d",
};
```

## New state variables
- `selectedCaptTipo: string | null` — for treemap #4 legend filter
- `selectedReceitaCat: string | null` — for treemap #12 legend filter

## Helper: 12-month filter (reusable pattern)
Create a small helper `filterLast12` used by all the new memos (contas already done, add for captação, AuC, faixa cli, faixa auc, receita).

No other files affected.

