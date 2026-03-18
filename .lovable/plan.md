

# Change consolidado_receita sheet mapping

## Change

In `src/pages/ImportarBases.tsx` line 80, replace:
```
sheets: { __first__: "raw_consolidado_receita" },
```
with:
```
sheets: { "Receita Consolidada": "raw_consolidado_receita" },
```

Also update the same mapping in `supabase/functions/ingest-sharepoint-file/index.ts` to keep them in sync.

Single-line change in each file. No other modifications needed.

