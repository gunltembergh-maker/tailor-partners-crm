

# Dashboard Comercial — Layout 1:1 Power BI

## Resumo

Reescrever os componentes do Dashboard Comercial para reproduzir o grid, slicers e estilo visual do Power BI. Mudança principal: filtros com "Aplicar/Limpar" (queries só disparam ao clicar), chips de seleções ativas no topo, layout de cards/gráficos em grid PBI, e estilização flat com bordas sutis.

## Alterações

### 1. `src/hooks/useDashboardFilters.ts`
- Separar estado em `pendingFilters` (editados na sidebar) e `appliedFilters` (usado nas queries).
- `applyFilters()` copia pending → applied e dispara re-render das queries.
- `resetFilters()` limpa ambos.
- Exportar `{ pendingFilters, appliedFilters, updatePendingFilter, applyFilters, resetFilters, hasChanges }`.

### 2. `src/components/dashboard/FiltersSidebar.tsx`
- Usar `pendingFilters` para edição, `appliedFilters` para chips.
- Adicionar busca (Input com filtro local) dentro dos multi-selects de Banker/Advisor/Finder.
- Botões fixos no rodapé: "Aplicar" (primary) e "Limpar" (ghost).
- Visual PBI: fundo `bg-[#F2F2F2]`, bordas cinza claro, labels em uppercase, selects com borda fina.
- Chips de seleções ativas exibidos no topo da página (fora da sidebar).

### 3. `src/pages/DashboardComercial.tsx`
- Passar `appliedFilters` para as tabs (queries).
- Passar `pendingFilters` + `updatePendingFilter` para sidebar.
- Adicionar barra de chips ativos entre header e conteúdo.
- Remover `LastUpdateBadges` do topo e colocar inline discreto no header.

### 4. `src/components/dashboard/QuantitativoTab.tsx`
Reescrever layout para grid PBI:

```text
Row 1: [Migração] [Habilitação] [Ativação] [Captação MTD] [Captação YTD]
Row 2: [Captação por Mês (2/3)]          [Captação por Tipo (1/3)]
Row 3: [AuC por Mês (1/2)]               [AuC por Casa (1/2)]
Row 4: [Clientes/AuC por Faixa PL (1/2)] [Receita Tailor por Mês (1/2)]
Row 5: [Receita por Categoria (full)]
```

- Estilo: Cards sem sombra, borda `border-gray-200`, header com linha inferior, título em 11px uppercase cinza.
- Gráficos: cores PBI (azul `#4472C4`, laranja `#ED7D31`, cinza `#A5A5A5`, amarelo `#FFC000`), eixos com gridlines sutis, labels formatados pt-BR (R$, separador milhar).
- Tooltip customizado com formatação BRL completa.
- Legenda posicionada embaixo dos gráficos.

### 5. `src/components/dashboard/QualitativoTab.tsx`
- Diversificador e Receita Top Produtos: manter tabelas mas com estilo PBI (rows alternadas, header cinza).
- Adicionar gráficos de barras horizontais para Top 10 Produtos (NET) e Top 10 Receita.
- NPS/MtM RF: manter placeholders.

### 6. `src/components/dashboard/MetricCard.tsx`
- Estilo PBI: borda fina cinza, sem sombra, valor em azul escuro `#1B2A3D`, título 10px uppercase cinza `#666`.

### 7. `src/components/dashboard/LastUpdateBadges.tsx`
- Compactar para exibição inline no header (ícone clock + texto pequeno).

## Arquivos

| Arquivo | Acao |
|---|---|
| `src/hooks/useDashboardFilters.ts` | Reescrever — pending/applied |
| `src/components/dashboard/FiltersSidebar.tsx` | Reescrever — PBI slicers + Aplicar/Limpar |
| `src/pages/DashboardComercial.tsx` | Editar — chips, layout |
| `src/components/dashboard/QuantitativoTab.tsx` | Reescrever — grid PBI |
| `src/components/dashboard/QualitativoTab.tsx` | Reescrever — estilo PBI |
| `src/components/dashboard/MetricCard.tsx` | Editar — estilo PBI |
| `src/components/dashboard/LastUpdateBadges.tsx` | Editar — compactar |

