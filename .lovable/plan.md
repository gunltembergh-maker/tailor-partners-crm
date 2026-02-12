
# Paineis (Fluxo de Inteligencia) e Relatorios

## Resumo

Reescrever `src/pages/Paineis.tsx` com uma pagina informativa "Fluxo de Inteligencia (CRM)" contendo 5 colunas/cards visuais que servem como guia de uso do CRM. Reescrever `src/pages/Relatorios.tsx` com 4 relatorios baseados em dados reais usando graficos do recharts.

---

## O que muda para o usuario

1. **Paineis** deixa de ser placeholder e exibe um fluxo visual com 5 etapas do CRM (Captura, Processamento, Distribuicao, Historico, Expansao), cada uma com icones e textos curtos explicativos
2. **Relatorios** exibe 4 graficos interativos:
   - Leads por status (ultimos 90 dias) - grafico de barras
   - Conversao por responsavel (ultimos 90 dias) - grafico de barras horizontal
   - Oportunidades ganhas/perdidas por mes - grafico de barras agrupado
   - Carteira de clientes por status - grafico de barras com soma de patrimonio/receita

---

## Detalhes Tecnicos

### 1. Reescrever `src/pages/Paineis.tsx`

Pagina estatica/informativa com layout horizontal de 5 cards conectados por setas visuais (ou grid responsivo). Cada card representa uma etapa do fluxo:

| Etapa | Icone | Titulo | Itens |
|-------|-------|--------|-------|
| 1. Captura de dados | Globe | Captura de Dados | Site, WhatsApp, Formularios, Plataformas |
| 2. Processamento e analise | Brain/Cpu | Processamento e Analise | Segmento, Potencial, Score |
| 3. Distribuicao interna | Share2/Network | Distribuicao Interna | Comercial, Marketing, Atendimento, Operacoes |
| 4. Historico e aprendizado | BookOpen/History | Historico e Aprendizado | Registro continuo, Alertas, Previsoes |
| 5. Expansao de receita | TrendingUp | Expansao de Receita | Upsell, Cross-sell, Novas ofertas |

Usar Cards do shadcn com icones do lucide-react. Layout responsivo: 5 colunas em desktop, empilhado em mobile. Entre cada card, um icone de seta (ChevronRight ou ArrowRight) para indicar fluxo.

### 2. Reescrever `src/pages/Relatorios.tsx`

Carregar dados de `leads`, `clients`, `opportunities` e `profiles` do Supabase. Processar no cliente para gerar 4 relatorios:

**Relatorio 1 - Leads por Status (90 dias):**
- Filtrar leads com created_at nos ultimos 90 dias
- Agrupar por status e contar
- Grafico de barras vertical usando recharts (BarChart + ChartContainer)

**Relatorio 2 - Conversao por Responsavel (90 dias):**
- Filtrar leads com created_at nos ultimos 90 dias
- Agrupar por owner_id, contar total e convertidos (status=CONVERTIDO)
- Calcular taxa = convertidos/total
- Resolver nome via profiles
- Grafico de barras horizontal

**Relatorio 3 - Oportunidades Ganhas/Perdidas por Mes:**
- Filtrar oportunidades com stage GANHA ou PERDIDA
- Agrupar por mes (usando last_update_at ou updated_at)
- Contar ganhas e perdidas por mes
- Grafico de barras agrupado (2 series: ganhas em verde, perdidas em vermelho)

**Relatorio 4 - Carteira de Clientes por Status:**
- Agrupar clientes por status (ATIVO_NET, INATIVO_PLD, CRITICO)
- Somar patrimonio_ou_receita por grupo
- Grafico de barras com valor em R$

Usar componentes `ChartContainer`, `ChartTooltip`, `ChartTooltipContent` do chart.tsx ja existente, com `BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid` do recharts.

Layout: 2x2 grid de cards, cada card com titulo e grafico dentro.

---

## Arquivos modificados (2)

- `src/pages/Paineis.tsx` - reescrita com fluxo visual de 5 etapas
- `src/pages/Relatorios.tsx` - reescrita com 4 graficos recharts

## Nenhum arquivo novo

## Nenhuma migracao de banco necessaria
