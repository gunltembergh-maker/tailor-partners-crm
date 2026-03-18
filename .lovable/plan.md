

# Change `raw` option in `readSheet` function

## Summary
In `src/pages/ImportarBases.tsx`, change the `raw` option from `true` to `false` in the `XLSX.utils.sheet_to_json` call inside the `readSheet` function.

## Change

| File | Line | Change |
|---|---|---|
| `src/pages/ImportarBases.tsx` | `readSheet` function, `sheet_to_json` call | `raw: true` → `raw: false` |

Single-line change. Everything else remains intact.

