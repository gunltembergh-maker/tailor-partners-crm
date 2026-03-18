

# Expandir importação DePara — todas as sheets

## 1. Database Migration — Create 9 new raw tables

Create tables with same structure as existing raw_* tables (id bigserial, data jsonb, ingested_at timestamptz), plus RLS policies matching existing pattern (anon insert/delete, admin read, service_role all):

- `raw_base_consolidada`
- `raw_base_cambio`
- `raw_base_gestora`
- `raw_base_corp_seguros`
- `raw_base_avenue`
- `raw_base_fo`
- `raw_base_lavoro`
- `raw_desligados`
- `raw_produzido_historico`
- `raw_podio`

## 2. `src/pages/ImportarBases.tsx`

**SOURCE_MAP** — expand the `depara` entry:
```
depara: {
  label: "DePara",
  sheets: {
    "DePara": "raw_depara",
    "Base CRM": "raw_base_crm",
    "Base Consolidada": "raw_base_consolidada",
    "Base Câmbio": "raw_base_cambio",
    "Base Gestora": "raw_base_gestora",
    "Base Corporate Seguros": "raw_base_corp_seguros",
    "Base Avenue": "raw_base_avenue",
    "F & O": "raw_base_fo",
    "Base Lavoro": "raw_base_lavoro",
    "Desligados": "raw_desligados",
    "Produzido Histórico": "raw_produzido_historico",
    "Pódio": "raw_podio",
  },
},
```

**RawTable type** — add the 10 new table names to the union.

## 3. `supabase/functions/ingest-sharepoint-file/index.ts`

Same expansion of the `depara` entry in `SOURCE_MAP`.

## Files

| File | Action |
|---|---|
| Migration SQL | Create 10 raw_* tables with RLS |
| `src/pages/ImportarBases.tsx` | Expand depara mapping + RawTable type |
| `supabase/functions/ingest-sharepoint-file/index.ts` | Expand depara mapping |

No other logic changes needed — the existing import loop already handles missing sheets gracefully (logs warning and continues), and the total rows counter already sums across all sheets.

