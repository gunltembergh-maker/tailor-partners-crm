

# Dashboard Comercial — Recriação no HUB

## Resumo

Criar o Dashboard Comercial nativo com dados das raw tables, substituindo o embed Power BI. Inclui views SQL curated, página com tabs Quantitativo/Qualitativo, filtros laterais e gráficos recharts.

## 1. Migração SQL — Views curated

Criar/atualizar views extraindo colunas do JSONB. Views existentes (`vw_base_crm`, `vw_diversificador_consolidado`, `vw_positivador_total_agrupado`) serão recriadas com campos adicionais. Novas views:

```text
vw_captacao_total
  raw_captacao_total → Data, Documento, Banker, Advisor, Finder, Casa,
                       Tipo de Cliente, Tipo de Captação, Aporte, Resgate, Captação

vw_contas_total
  raw_contas_total → Data, AnoMes, Tipo, Documento, Banker, Advisor, Finder, Tipo de Cliente

vw_positivador_total_agrupado (UPDATE)
  + AnoMes, Documento, Casa, Faixa PL, Ordem PL, Finder, Tipo de Cliente

vw_diversificador_consolidado (UPDATE)
  + Data Posição, Documento, Ativo Ajustado, NET, Indexador, Produto Ajustado,
    Vencimento, Casa, Banker, Finder, Tipo Cliente

vw_receita_detalhada (NEW)
  UNION raw_comissoes_historico + raw_comissoes_m0
  → Data, Categoria, Produto, Subproduto, Comissão Bruta Tailor,
    Documento, Cliente, Banker, Advisor, Tipo Cliente

vw_receita_mensal (NEW)
  Aggregate vw_receita_detalhada → Documento + mes_ano + SUM(comissao)

vw_base_crm (UPDATE)
  Existing fields already cover the need. Minor additions if needed.
```

All views use `security_invoker = true` (existing pattern).

## 2. Sidebar

Replace "Dash Comercial" (PBI embed) with a "Dashboards" group containing "Comercial" pointing to `/dashboards/comercial`. Keep old PBI route for backward compat but remove from menu.

## 3. Route

Add `/dashboards/comercial` → new `DashboardComercial` component.

## 4. Page: `src/pages/DashboardComercial.tsx`

Main layout with `AppLayout`, tabs (Quantitativo / Qualitativo).

**Top bar**: "Última atualização" badges per base from `sync_logs` (latest by `source_key`).

**Sidebar de filtros** (left collapsible panel):
- Período (date range picker)
- Banker, Advisor, Finder (multi-select from distinct values)
- Documento (search input)
- Tipo Cliente, Casa (select)

All filters passed as query params to view queries.

### Tab Quantitativo

**Cards row 1 — Contas** (from `vw_contas_total`):
- Migração (Tipo = "Migração"), Habilitação, Ativação — count by period

**Cards row 2 — Captação** (from `vw_captacao_total`):
- Captação MTD, Captação YTD — sum of Captação field

**Charts** (recharts):
- Captação por mês (BarChart, grouped by AnoMes)
- Captação por Tipo (PieChart)
- AuC por mês (from `vw_positivador_total_agrupado`, LineChart)
- AuC por Casa (BarChart horizontal)
- Clientes e AuC por Faixa PL (BarChart)
- Receita Tailor por mês (from `vw_receita_mensal`, BarChart)
- Receita por Categoria / Produto (from `vw_receita_detalhada`, TreeMap or stacked bar)

### Tab Qualitativo

Components using DePara/Diversificador/Positivador/Receita views. NPS/MtM RF sections show placeholder "Base ainda não importada".

## 5. Helper hooks

- `useDashboardFilters()` — state management for all filters
- `useDashboardData(filters)` — queries to curated views with filters applied, using react-query

## 6. Files

| Arquivo | Acao |
|---|---|
| Migration SQL | Criar — all views |
| `src/pages/DashboardComercial.tsx` | Criar — main page |
| `src/hooks/useDashboardFilters.ts` | Criar — filter state |
| `src/hooks/useDashboardData.ts` | Criar — data queries |
| `src/components/dashboard/FiltersSidebar.tsx` | Criar — filter panel |
| `src/components/dashboard/QuantitativoTab.tsx` | Criar — charts + cards |
| `src/components/dashboard/QualitativoTab.tsx` | Criar — qualitative tab |
| `src/components/dashboard/MetricCard.tsx` | Criar — reusable card |
| `src/components/dashboard/LastUpdateBadges.tsx` | Criar — sync_logs badges |
| `src/components/AppSidebar.tsx` | Editar — add Dashboards group |
| `src/App.tsx` | Editar — add route |

