

# Add `contasMeses` filtering logic to QuantitativoTab

## Summary
Add a `contasMeses` useMemo to `QuantitativoTab.tsx` that filters `contasAgg` data by the selected `anoMes` filter values. When no months are selected, it defaults to the most recent 12 months. This filtered data will then be used by the "Contas" chart instead of raw `contasAgg`.

## Mapping from snippet to existing code
- `contasData` → `contasAgg` (from `useContasAggMes`)
- `selectedMonths` → `filters.anoMes` (from the `DashboardFilters` prop)

## Changes

**`src/components/dashboard/QuantitativoTab.tsx`**

1. Add `contasMeses` memo after line 208 (after `contasComTotal`):
```typescript
const contasMeses = useMemo(() => {
  const todosAnomes = [...new Set(contasAgg?.map((d: any) => d.anomes) ?? [])].sort((a, b) => b - a);
  const anomesFiltrados = filters.anoMes?.length > 0
    ? todosAnomes.filter(m => filters.anoMes.includes(String(m)))
    : todosAnomes.slice(0, 12);
  return (contasAgg ?? []).filter((d: any) => anomesFiltrados.includes(d.anomes));
}, [contasAgg, filters.anoMes]);
```

2. Update `contasComTotal` memo to use `contasMeses` instead of `contasAgg` as its data source.

No other files affected.

