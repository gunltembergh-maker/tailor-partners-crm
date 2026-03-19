

# Replace QuantitativoTab.tsx with uploaded version

## Summary
Replace `src/components/dashboard/QuantitativoTab.tsx` (597 lines) with the uploaded version (489 lines).

Key differences:
- Renamed formatting functions: `fmtBRL` → `fmtMi`, `fmtBRLFull` → `fmtFull`, new `fmtKpi` function
- Added `Percent100Tooltip` component for stacked 100% bar charts
- Added `BarTopLabel` component for label rendering on top of stacked bars
- Added `pivotDesc` helper for descending-sorted pivot transformation
- Added `MatrizNode` interface and `buildMatrizTree` / `MatrizRow` for hierarchical revenue matrix table
- New data hooks used: `useFaixaPlClientesMes`, `useFaixaPlAucMes`, `useReceitaTotal`, `useReceitaMesCategoria`, `useReceitaTreemapCategoria`, `useReceitaMatrizRows`
- New chart sections: Faixa PL clients/AuC, Revenue matrix table, Revenue by month/category charts
- Removed unused imports (`formatBRL` from `@/lib/format`)

## Change

| File | Action |
|---|---|
| `src/components/dashboard/QuantitativoTab.tsx` | Overwrite with uploaded 489-line file |

No other files affected.

