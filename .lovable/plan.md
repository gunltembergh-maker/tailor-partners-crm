

# Quantitativo Parte 1 — RPCs + Default 14 Meses

## Resumo

Substituir as queries diretas às views por chamadas aos RPCs existentes (`rpc_contas_kpis`, `rpc_contas_agg_mes`, `rpc_contas_total_por_tipo`), implementar default de últimos 14 AnoMes, e garantir que queries só disparam ao clicar Aplicar.

## Alterações

### 1. `src/hooks/useDashboardFilters.ts`
- Computar default `anoMes` com últimos 14 meses (baseado na data atual: max AnoMes até max-13).
- Usar esse array como valor inicial de `pendingFilters.anoMes` e `appliedFilters.anoMes`.
- `resetFilters` volta ao default (14 meses), não vazio.

### 2. `src/hooks/useDashboardData.ts`
- Criar `useContasKpis(filters)` — chama `supabase.rpc('rpc_contas_kpis', { p_anomes, p_banker, p_documento, p_advisor, p_finder, p_tipo_cliente })`.
- Criar `useContasAggMes(filters)` — chama `supabase.rpc('rpc_contas_agg_mes', ...)`.
- Criar `useContasTotalPorTipo(filters)` — chama `supabase.rpc('rpc_contas_total_por_tipo', ...)`.
- Helper function `buildRpcParams(filters)` converte DashboardFilters → RPC params (arrays de int/string, null quando vazio).
- Manter hooks antigos para outras seções (Captação, AuC, Receita) por enquanto.

### 3. `src/components/dashboard/QuantitativoTab.tsx`
- Importar os 3 novos hooks em vez de `useContasData`.
- Cards (Migração/Habilitação/Ativação): usar `useContasKpis` diretamente (retorna `{ migracao, habilitacao, ativacao }`).
- Gráfico "Contas por Mês": usar `useContasAggMes` (retorna `{ anomes, anomes_nome, tipo, qtd }[]`) — pivotar por tipo para stacked bar.
- Gráfico "Total por Tipo": usar `useContasTotalPorTipo` (retorna `{ tipo, casa, qtd }[]`) — pivotar por casa para horizontal stacked bar.
- Remover lógica de contagem manual client-side dos contas.

### 4. `src/components/dashboard/FiltersSidebar.tsx`
- `useFilterOptions`: mudar fonte de AnoMes para `vw_dim_anomes` (retorna `anomes` int) em vez de extrair de `vw_captacao_total`. Também usar `vw_dim_banker`, `vw_dim_advisor`, `vw_dim_tipo_cliente` para as dimensões.
- Formatar AnoMes int (202603) → "Mar/2026" no display.

## Arquivos

| Arquivo | Ação |
|---|---|
| `src/hooks/useDashboardFilters.ts` | Editar — default 14 meses |
| `src/hooks/useDashboardData.ts` | Editar — 3 novos hooks RPC + `useFilterOptions` usar dim views |
| `src/components/dashboard/QuantitativoTab.tsx` | Editar — usar hooks RPC para Row 1 e Row 2 |
| `src/components/dashboard/FiltersSidebar.tsx` | Editar — int AnoMes format |

