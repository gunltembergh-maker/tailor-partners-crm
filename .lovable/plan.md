

# Cross-filtering by click on all charts

## Summary
Add a `clickedMonth` state (YYYYMM number or null) to `QuantitativoTab`. Clicking any bar/point sets it; clicking the same month again clears it. When active, all RPCs and derived data filter to that single month. A dismiss banner appears at the top.

## Architecture

The cross-filter works by creating an `effectiveFilters` object derived from the parent `filters` prop, overriding `anoMes` with `[String(clickedMonth)]` when active. All hooks already accept `filters` — we pass `effectiveFilters` instead. This means zero RPC changes; the existing `p_anomes` parameter handles single-month filtering naturally.

## Changes (single file: `QuantitativoTab.tsx`)

### 1. New state + effective filters
```ts
const [clickedMonth, setClickedMonth] = useState<number|null>(null);

const effectiveFilters = useMemo(() => {
  if (!clickedMonth) return filters;
  return { ...filters, anoMes: [String(clickedMonth)] };
}, [filters, clickedMonth]);
```

### 2. Replace `filters` with `effectiveFilters` in ALL hooks
All 15 `use*` hook calls (lines 235-249) switch from `filters` to `effectiveFilters`. The `filterLast12` memos also use `effectiveFilters.anoMes`.

### 3. Click handler
```ts
const handleChartClick = (data: any, anoMesKey = "anomes") => {
  if (!data?.activePayload?.[0]) return;
  const raw = data.activePayload[0].payload;
  const am = Number(raw._anomes ?? raw[anoMesKey]);
  if (!am) return;
  setClickedMonth(prev => prev === am ? null : am);
};
```

### 4. Attach `onClick` to all BarChart/AreaChart components
Add `onClick={handleChartClick}` to:
- Contas BarChart
- Captação por Mês BarChart
- AuC por Mês BarChart
- # Cliente Faixa PL AreaChart
- AuC Faixa PL AreaChart
- Receita Bruta BarChart

Also add `cursor: "pointer"` style to all `<Bar>` and `<Area>` components via the `style` prop or `cursor="pointer"`.

### 5. Store `_anomes` in pivoted data
The `pivotDesc` function already stores `_anomes`. The `contasComTotal` memo needs to also store `_anomes` on each row (it currently stores `_cat` for label). Same for `captacaoPorMes`. This ensures `handleChartClick` can read the numeric month.

### 6. Banner at top of the component
```tsx
{clickedMonth && (
  <div className="flex items-center justify-between rounded px-3 py-1.5 mb-2 text-white text-xs"
    style={{ backgroundColor: "#1e3a5f" }}>
    <span>Filtrando: {monthLabel}  </span>
    <button onClick={() => setClickedMonth(null)} className="ml-2 hover:opacity-80">✕ Limpar filtro</button>
  </div>
)}
```
Where `monthLabel` is derived from `to_char` format (e.g. "Nov/25") using a small lookup from the data.

### 7. Visual selection indicator
Add conditional stroke/strokeWidth on Bar/Area for the selected month. On BarChart, use `shape` prop or wrap cells to add a thicker border when the bar's `_anomes` matches `clickedMonth`.

### 8. When clickedMonth changes, reset filters.anoMes override
If the user changes `filters.anoMes` from the sidebar, clear `clickedMonth` to avoid conflicts:
```ts
useEffect(() => { setClickedMonth(null); }, [filters.anoMes]);
```

## What stays unchanged
- Banker filter logic
- All RPC definitions
- All other files
- Sidebar filter behavior
- QualitativoTab

