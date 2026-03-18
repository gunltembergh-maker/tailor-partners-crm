

# Fix TypeScript errors in ImportarBases.tsx

## Problem
The `XLSX.read` and `sheet_to_json` calls have TypeScript issues with their options.

## Changes — single file: `src/pages/ImportarBases.tsx`

1. **Line 324** — Simplify `XLSX.read` options to `{ type: "array", cellDates: true }` (remove `cellNF` and `cellText` which may cause TS issues).

2. **Lines 242-248** — In `readSheet`, update `sheet_to_json` call to include all three options explicitly:
```ts
const rows = XLSX.utils.sheet_to_json(ws, {
  defval: null,
  raw: true,
  cellDates: true,
} as any);
```
The `as any` cast is needed because `cellDates` is not in the `sheet_to_json` type definition but is supported at runtime by SheetJS.

No other files affected. All component logic remains intact.

