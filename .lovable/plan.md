

# Fix Text Visibility + ROA M0 Table Height in QualitativoTab.tsx

Only file changed: `src/components/dashboard/QualitativoTab.tsx`

## AJUSTE 1 — Text Visibility

### SortableTable
- **Header (thead th)**: Already has white text on dark bg — keep as-is (it's readable)
- **Body cells (td)**: Change `text-[10px]` to `text-[13px]` and add `text-[#111827] font-medium` (fontWeight 500). For numeric columns the `fmt` function handles display; add `font-semibold` (600) for right-aligned numeric cells
- **Footer (tfoot td)**: Add `text-[13px] text-[#111827] font-bold` (700)
- Remove any `text-muted-foreground` or light gray classes from cell content

### Chart Labels & Axes
- **AuC bar labels** (lines 515, 518, 521): Change `fontSize: 8`/`9` and fill colors to `fontSize: 12, fill: "#111827", fontWeight: 700`
- **Vencimentos stacked bar label** (line 569): Change `fontSize: 8` to `fontSize: 12, fill: "#111827", fontWeight: 700`
- **ROA line labels** (lines 623, 669): Change `fontSize: 7` to `fontSize: 11, fill: "#111827", fontWeight: 700`
- **Donut labels** (line 103): Change `fontSize={8}` to `fontSize={11}`, `fill="#111827"`, add `fontWeight={600}`
- **XAxis/YAxis ticks** across all charts: Change `fontSize: 8`/`9`/`10` and `fill: "#666"` to `fontSize: 11, fill: "#374151"`
- **Legend text** in manual legend divs (lines 502-506, 599-605, 647-653): Change `text-[9px] text-muted-foreground` to `text-[12px] text-[#111827] font-medium`
- **Tooltip text**: Already readable, but ensure `text-foreground` class is present

### Donut legend
- Line 124-127: Change `text-[9px]` to `text-[12px]` and add `text-[#111827] font-medium`

## AJUSTE 2 — ROA M0 Table Fill Card

- **PbiCard** (line 79-88): The ROA M0 card wrapper needs `className="flex flex-col h-full"` on the outer div, and `className="p-2 flex-1 flex flex-col"` on the content div
- Add a variant or prop to PbiCard: `fill?: boolean` — when true, outer div gets `flex flex-col h-full` and inner content div gets `flex-1 flex flex-col`
- **SortableTable** for ROA M0 (line 632-641): Remove `maxH={200}` (set to undefined or a large value), wrap the table scroll div with `flex-1` so it grows to fill the card
- The parent grid row (line 597) already uses `grid-cols-[65%_35%]` which sets equal height — the card just needs to stretch internally
- Add `className="h-full"` to the ROA M0 PbiCard usage (line 631)

### Implementation detail for PbiCard
Add optional `fill` prop:
```tsx
function PbiCard({ title, children, className, fill }: { title: string; children: React.ReactNode; className?: string; fill?: boolean }) {
  return (
    <div className={`bg-card border border-border rounded-lg shadow-sm overflow-hidden ${fill ? "flex flex-col h-full" : ""} ${className ?? ""}`}>
      <div className="px-3 py-1.5 border-b border-border">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground">{title}</p>
      </div>
      <div className={`p-2 ${fill ? "flex-1 flex flex-col" : ""}`}>{children}</div>
    </div>
  );
}
```

For SortableTable, add a `fill` prop that replaces the fixed `maxHeight` with `flex: 1`:
```tsx
// When fill=true, the scroll container uses flex-1 instead of maxHeight
<div className={`overflow-x-auto overflow-y-auto ${fill ? "flex-1" : ""}`} style={fill ? {} : { maxHeight: maxH }}>
```

Use `<PbiCard title="ROA Anualizado Ponderado M0" fill>` and `<SortableTable fill ... />` for the ROA M0 section.

