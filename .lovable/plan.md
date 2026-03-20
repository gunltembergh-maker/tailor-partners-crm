

# 4-Level Drill-Down for Receita Table

## Summary
Replace the current single-level drill with a 4-level hierarchy (Categoria → Subcategoria → Produto → Cliente/Documento), using a new RPC for data and breadcrumb navigation.

## Changes

### 1. New RPC: `rpc_receita_drilldown` (database migration)

A single flexible RPC that returns the next level's data based on which parameters are passed:

```sql
CREATE OR REPLACE FUNCTION public.rpc_receita_drilldown(
  p_anomes integer[] DEFAULT NULL,
  p_banker text[] DEFAULT NULL,
  p_categoria text DEFAULT NULL,
  p_subcategoria text DEFAULT NULL,
  p_produto text DEFAULT NULL
) RETURNS TABLE(label text, anomes integer, anomes_nome text, valor numeric)
LANGUAGE sql STABLE AS $$
  SELECT
    CASE
      WHEN p_produto IS NOT NULL THEN documento
      WHEN p_subcategoria IS NOT NULL THEN produto
      WHEN p_categoria IS NOT NULL THEN subcategoria
      ELSE categoria
    END AS label,
    anomes,
    to_char(to_date(anomes::text,'YYYYMM'),'Mon/YY') AS anomes_nome,
    SUM(COALESCE(comissao_bruta_tailor, 0)) AS valor
  FROM comissoes_consolidado_filtrado
  WHERE (p_anomes IS NULL OR anomes = ANY(p_anomes))
    AND (p_banker IS NULL OR banker = ANY(p_banker))
    AND (p_categoria IS NULL OR categoria = p_categoria)
    AND (p_subcategoria IS NULL OR subcategoria = p_subcategoria)
    AND (p_produto IS NULL OR produto = p_produto)
  GROUP BY 1, anomes
  ORDER BY 1, anomes DESC;
$$;
```

### 2. Frontend changes (`QuantitativoTab.tsx`)

**State**: Replace `drillCategory: string|null` with a breadcrumb path array:
```ts
const [drillPath, setDrillPath] = useState<string[]>([]); 
// [] = level 1 (categories), ["Assessoria"] = level 2, 
// ["Assessoria","XPI"] = level 3, ["Assessoria","XPI","Previdência"] = level 4
```

**New hook call**: Add `useDrilldownData` using `useQuery` that calls `rpc_receita_drilldown` with the current path parameters + effectiveFilters. The query re-fetches whenever `drillPath` changes.

**Breadcrumb**: Above the table, render path like `Receita > Assessoria > XPI > Previdência` with each segment clickable to navigate back to that level.

**"← Voltar" button**: Goes up one level (`drillPath.slice(0, -1)`).

**Column header**: Changes per level — "Categoria" / "Subcategoria" / "Produto" / "Cliente".

**Click behavior**: Levels 1-3 rows are clickable (cursor pointer), pushing to `drillPath`. Level 4 rows are not clickable.

**Reset**: `useEffect` clears `drillPath` when `clickedMonth` or `filters.anoMes` changes (same as current).

**Data rendering**: The drilldown RPC returns flat `(label, anomes, valor)` rows. Frontend pivots them into the same month-column matrix format using `buildMatrizFlat`-like logic, keyed by `label` instead of `categoria`.

### 3. New hook in `useDashboardData.ts`

```ts
export function useReceitaDrilldown(filters: DashboardFilters, drillPath: string[]) {
  const params = {
    p_anomes: filters.anoMes.length ? filters.anoMes.map(Number) : null,
    p_banker: filters.banker.length ? filters.banker : null,
    p_categoria: drillPath[0] ?? null,
    p_subcategoria: drillPath[1] ?? null,
    p_produto: drillPath[2] ?? null,
  };
  return useQuery({
    queryKey: ["receita-drilldown", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_receita_drilldown", params as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
    enabled: drillPath.length > 0,
  });
}
```

When `drillPath` is empty, use existing `receitaMatrizCat` data (level 1 = categories). When `drillPath.length > 0`, use the drilldown RPC data.

## Files affected
| File | Change |
|---|---|
| New migration SQL | Create `rpc_receita_drilldown` |
| `src/hooks/useDashboardData.ts` | Add `useReceitaDrilldown` hook |
| `src/components/dashboard/QuantitativoTab.tsx` | Replace drill state, add breadcrumb, 4-level table rendering |

