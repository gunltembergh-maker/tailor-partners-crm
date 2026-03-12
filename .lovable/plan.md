

# Dashboard Comercial — Visual PBI 1:1 + Auditoria Comercial

## Resumo

Tres frentes: (A) overhaul visual do Dashboard para parecer PBI, (B) criar página Auditoria Comercial, (C) auto-refresh (ja implementado — apenas verificar).

---

## A. Visual PBI 1:1

### 1. `DashboardComercial.tsx` — Layout principal
- Fundo cinza claro `bg-[#F2F2F2]` (canvas PBI).
- Sidebar de filtros integrada como componente fixo à esquerda (não collapsible — sempre visível no desktop, drawer no mobile).
- Chips de seleções ativas entre header e conteúdo.
- Refresh bar e timestamp já implementados (manter).

### 2. `FiltersSidebar.tsx` — Sidebar PBI-like
- Fundo azul marinho escuro `bg-[#1B2A3D]` com texto branco.
- Logo "Tailor" no topo.
- Título "FILTROS" em branco.
- Ordem dos slicers conforme solicitado: Ano Mes, Financial Advisor, Documento, Advisor, Banker, Tipo de Cliente, Vencimento (apenas no Qualitativo).
- Slicers em dropdown com search e multi-select (estilo PBI).
- Botões "Aplicar" e "Limpar" no rodapé.
- Receber prop `showVencimento` para controlar visibilidade do slicer Vencimento.

### 3. `QuantitativoTab.tsx` — Grid PBI
Cards e gráficos em containers brancos com `border border-gray-200 shadow-sm rounded-lg`:

```text
Row 1: [Migração] [Habilitação] [Ativação]
Row 2: [Contas por Mês (2/3)] [Total por Tipo (1/3)]
Row 3: [Captação MTD] [Captação YTD]
Row 4: [Captação por Mês (2/3)] [Tipo de Captação - treemap (1/3)]
Row 5: [AuC por Mês (1/2)] [AuC por Casa - donut (1/2)]
Row 6: [# Clientes por Faixa PL (1/2)] [AuC por Faixa PL (1/2)]
Row 7: [Receita Bruta Tailor card]
Row 8: [Receita tabela Categoria x Mês]
Row 9: [Receita por Mês stacked (1/2)] [Receita por Categoria treemap (1/2)]
```

- Cores PBI: `#4472C4`, `#ED7D31`, `#A5A5A5`, `#FFC000`, `#5B9BD5`, `#70AD47`, `#264478`, `#9B59B6`.
- Tooltip e eixos formatados pt-BR (R$, separador milhar).
- Treemaps usando recharts Treemap para Tipo de Captação e Receita por Categoria.

### 4. `QualitativoTab.tsx` — Grid PBI
```text
Row 1: Clientes (tabela com header fixo e scroll vertical)
Row 2: AuC por Faixa PL (bar + line combo)
Row 3: [Custódia por Indexador - donut (1/2)] [Custódia por Veículo - donut (1/2)]
Row 4: Todos os Ativos (tabela com scroll)
Row 5: Vencimentos (stacked bar por ano)
Row 6: Vencimentos (tabela detalhada)
Row 7: [ROA PF (1/2)] [ROA PJ (1/2)]
Row 8: NPS placeholder | MtM RF placeholder
```

### 5. `MetricCard.tsx`
- Container branco, borda cinza clara, sombra leve, valor azul `#1B2A3D`.

### 6. `useDashboardFilters.ts`
- Adicionar campo `anoMes` (string[], multi-select) como primeiro filtro.
- Reordenar activeChips para incluir anoMes.

---

## B. Auditoria Comercial

### Nova página: `src/pages/AuditoriaComercial.tsx`
- Rota: `/admin/auditoria-comercial`
- Reutiliza `useDashboardFilters` e `useDashboardData`.
- Layout: filtros no topo (reutiliza FiltersSidebar inline) + KPIs do HUB + tabela comparativa.

**KPIs exibidos** (valores calculados do HUB):
1. Migração (count)
2. Habilitação (count)
3. Ativação (count)
4. Captação Líq MTD
5. Captação Líq YTD
6. AuC total do AnoMes selecionado
7. Receita Tailor total do período

**Tabela "Comparação com Power BI":**
- Colunas: Métrica | Valor HUB | Valor PBI (input editável) | Diferença | % Dif
- Inputs manuais para colar valores do PBI.
- Diferença e % Dif calculados automaticamente.
- Destaque visual quando diferença ~0 (verde) ou >5% (vermelho).

**Botão "Exportar CSV"** da tabela de comparação.

### Routing e Sidebar
- Adicionar rota `/admin/auditoria-comercial` em `App.tsx`.
- Adicionar item "Auditoria Comercial" ao grupo Admin no `AppSidebar.tsx`.

---

## C. Auto-refresh (verificação)

Ja implementado:
- Tabela `dashboard_refresh` existe com RLS e realtime.
- `ImportarBases.tsx` chama `increment_dashboard_refresh` após sucesso.
- `useDashboardRefresh` hook escuta realtime + polling 30s.
- `DashboardComercial.tsx` exibe timestamp e loading bar.

Nenhuma alteração necessária.

---

## Arquivos

| Arquivo | Ação |
|---|---|
| `src/pages/DashboardComercial.tsx` | Reescrever — canvas PBI, layout |
| `src/components/dashboard/FiltersSidebar.tsx` | Reescrever — sidebar azul marinho PBI |
| `src/components/dashboard/QuantitativoTab.tsx` | Reescrever — grid e estilo PBI |
| `src/components/dashboard/QualitativoTab.tsx` | Reescrever — grid e estilo PBI |
| `src/components/dashboard/MetricCard.tsx` | Editar — estilo PBI |
| `src/hooks/useDashboardFilters.ts` | Editar — add anoMes, reordenar |
| `src/pages/AuditoriaComercial.tsx` | Criar — página de auditoria |
| `src/App.tsx` | Editar — add rota auditoria |
| `src/components/AppSidebar.tsx` | Editar — add item auditoria |

