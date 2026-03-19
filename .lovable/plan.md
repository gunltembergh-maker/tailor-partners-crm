

# Fix Captação Líq. MTD/YTD cards

## Problem
- YTD without filter currently calculates Jan-to-latest-month of the current year (~year accumulation), but user wants the sum of ALL historical months (~R$833Mi).
- YTD with filter should equal MTD (single month value).

## Solution

### 1. Database migration — update `rpc_captacao_kpis`

Change the `captacao_ytd` calculation:
- **p_anomes IS NULL**: `SUM(captacao)` — no date filter at all, totals everything
- **p_anomes provided**: `SUM(captacao) FILTER (WHERE anomes = ref_mes)` — same as MTD

```sql
CREATE OR REPLACE FUNCTION public.rpc_captacao_kpis(...)
RETURNS TABLE(captacao_mtd numeric, captacao_ytd numeric)
...
  SELECT
    SUM(captacao) FILTER (WHERE anomes = (SELECT ref_mes FROM ref)) AS captacao_mtd,
    CASE
      WHEN p_anomes IS NULL THEN SUM(captacao)
      ELSE SUM(captacao) FILTER (WHERE anomes = (SELECT ref_mes FROM ref))
    END AS captacao_ytd
  FROM base;
```

### 2. Frontend — no changes needed

Line 458 already has the correct logic:
- MTD card: always shows `captacao_mtd`
- YTD card: shows `captacao_ytd` without filter, `captacao_mtd` with filter

The RPC fix alone satisfies all requirements.

| File | Change |
|---|---|
| New migration SQL | Update `rpc_captacao_kpis` YTD logic |

