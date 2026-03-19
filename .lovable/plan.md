

# Fix Captação Líq. MTD card to respond to clickedMonth

## Single change in `QuantitativoTab.tsx`

**Line 457**: Update the two MetricCard components to use dynamic labels based on `clickedMonth`:

```tsx
<MetricCard 
  title={clickedMonth ? `Captação Líq. ${monthLabel}` : "Captação Líq. MTD"} 
  value={fmtKpi(captKpis?.captacao_mtd??0)} 
  icon={ArrowUpRight}
/>
<MetricCard 
  title={clickedMonth ? `Captação Líq. YTD ${monthLabel}` : "Captação Líq. YTD"} 
  value={fmtKpi(captKpis?.captacao_ytd??0)} 
  icon={TrendingUp}
/>
```

The data itself already responds to `clickedMonth` because `captKpis` comes from `useCaptacaoKpis(effectiveFilters)` which passes the selected month to the RPC. Only the label needs updating — the `monthLabel` variable already exists and formats the month as "nov/25" style.

No other files or components affected.

