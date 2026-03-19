

# Fix Receita Bruta Tailor table showing only one category

## Problem
The `rpc_receita_matriz_rows` RPC returns ~16K grouped rows (categoria + subcategoria + produto + subproduto + anomes). When no month filter is active, Supabase's default 1000-row limit truncates results, returning only the first category alphabetically (Assessoria). With a single month filter, the result set is small enough to fit within the limit.

## Solution
Two changes:

### 1. New RPC: `rpc_receita_matriz_rows_cat` (database migration)
Create a lighter RPC that groups only by `categoria + anomes` (no subcategoria/produto/subproduto). This reduces ~16K rows to ~200, well within limits. The existing `rpc_receita_matriz_rows` stays for expanded drilldown.

```sql
CREATE OR REPLACE FUNCTION public.rpc_receita_matriz_rows_cat(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL
) RETURNS TABLE(categoria text, anomes integer, anomes_nome text, valor numeric)
LANGUAGE sql STABLE AS $$
  SELECT
    categoria,
    anomes,
    to_char(to_date(anomes::text,'YYYYMM'),'Mon/YY') AS anomes_nome,
    SUM(COALESCE(comissao_bruta_tailor, 0)) AS valor
  FROM comissoes_consolidado_filtrado
  WHERE (p_anomes IS NULL OR anomes = ANY(p_anomes))
    AND (p_banker IS NULL OR banker = ANY(p_banker))
  GROUP BY categoria, anomes
  ORDER BY categoria, anomes DESC;
$$;
```

### 2. Update `QuantitativoTab.tsx` — rebuild the matrix table logic

**Replace `buildMatrizTree` usage** with a simpler approach for the table:
- Use the new `rpc_receita_matriz_rows_cat` hook for the summary table
- Build a flat category-level matrix: one row per categoria, one column per month, plus Total
- Add a "Total" row at the top summing all categories per month
- When a category row is expanded, fetch detailed rows from the existing `rpc_receita_matriz_rows` filtered to that category (or use cached data)

**Simpler alternative (no new RPC):** Add a new hook `useReceitaMatrizRowsCat` in `useDashboardData.ts` that calls a new RPC, OR refactor `buildMatrizTree` to work with the category-level RPC.

### 3. Add hook in `useDashboardData.ts`
```ts
export function useReceitaMatrizRowsCat(filters: DashboardFilters) {
  const params = buildRpcParamsPbi(filters);
  return useQuery({
    queryKey: ["receita-matriz-rows-cat", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_receita_matriz_rows_cat", params as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}
```

### 4. Rebuild matrix table in `QuantitativoTab.tsx`
- Replace `buildMatrizTree(receitaMatrizRows)` with a new `buildMatrizFlat` that:
  - Extracts unique months (sorted desc) as columns
  - Groups rows by categoria, summing valor per month
  - Computes a Total column per category
  - Computes a Total row across all categories per month
- Keep expand/collapse for drilldown using the existing `receitaMatrizRows` (detail RPC) filtered per category on expand
- No changes to any other chart or section

## Files affected
| File | Change |
|---|---|
| New migration SQL | Create `rpc_receita_matriz_rows_cat` |
| `src/hooks/useDashboardData.ts` | Add `useReceitaMatrizRowsCat` hook |
| `src/components/dashboard/QuantitativoTab.tsx` | Replace matrix table data source and rebuild logic |

