

# Fix Captação Líq. MTD/YTD to properly respond to clickedMonth

## Problem
The RPC `rpc_captacao_kpis` ignores `p_anomes` in its base CTE. MTD always picks the latest month from ALL data, and YTD just sums rows matching `p_anomes` (not a true year-to-date).

When `clickedMonth = 202511`:
- **MTD** should = captação of Nov/25 → currently returns latest month (wrong)
- **YTD** should = captação Jan/25 through Nov/25 → currently returns only Nov/25 (wrong)

## Solution: Two changes

### 1. Database migration — fix `rpc_captacao_kpis`

Replace the function so that:
- When `p_anomes IS NULL`: MTD = max month in data, YTD = all months of that max month's year
- When `p_anomes` is provided: MTD = sum of the provided month(s), YTD = all months from Jan of that year up to and including max(p_anomes)

```sql
CREATE OR REPLACE FUNCTION public.rpc_captacao_kpis(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_documento text[] DEFAULT NULL,
  p_advisor text[] DEFAULT NULL,
  p_finder text[] DEFAULT NULL,
  p_tipo_cliente text[] DEFAULT NULL
) RETURNS TABLE(captacao_mtd numeric, captacao_ytd numeric)
LANGUAGE sql STABLE AS $$
  WITH base AS (
    SELECT anomes, captacao
    FROM captacao_consolidado_filtrado
    WHERE (p_banker IS NULL OR banker = ANY(p_banker))
      AND (p_documento IS NULL OR documento = ANY(p_documento))
      AND (p_advisor IS NULL OR advisor = ANY(p_advisor))
      AND (p_finder IS NULL OR finder = ANY(p_finder))
      AND (p_tipo_cliente IS NULL OR tipo_cliente = ANY(p_tipo_cliente))
  ),
  ref AS (
    SELECT COALESCE(
      (SELECT MAX(x) FROM unnest(p_anomes) x),
      (SELECT MAX(anomes) FROM base)
    ) AS ref_mes
  ),
  yr AS (
    SELECT (ref_mes / 100 * 100) AS year_start FROM ref  -- e.g. 202500
  )
  SELECT
    SUM(captacao) FILTER (WHERE anomes = (SELECT ref_mes FROM ref)) AS captacao_mtd,
    SUM(captacao) FILTER (
      WHERE anomes >= (SELECT year_start + 1 FROM yr)
        AND anomes <= (SELECT ref_mes FROM ref)
    ) AS captacao_ytd
  FROM base;
$$;
```

### 2. `QuantitativoTab.tsx` — labels (already done, verify)

Lines 457-458 already have the dynamic labels. No further frontend change needed — the data path (`useCaptacaoKpis(effectiveFilters)`) is already correct.

## Files affected
| File | Change |
|---|---|
| New migration SQL | Replace `rpc_captacao_kpis` with month-aware logic |

