

# Tela Inicio com Secoes Expansiveis

## Resumo

Reescrever `src/pages/Dashboard.tsx` para exibir 3 secoes expansiveis (Leads, Clientes, Oportunidades), cada uma com cards clicaveis contendo contadores e somatorios em R$. Cada card filtra e navega para a lista correspondente, e cada secao pode ser expandida para mostrar uma mini-tabela com os top 10 itens.

---

## O que muda para o usuario

1. Tela Inicio dividida em 3 secoes colapsaveis: Leads, Clientes, Oportunidades
2. Cada secao tem 5 cards com metricas especificas (contadores e valores em R$)
3. Clicar num card navega para a lista correspondente ja filtrada (via query params)
4. Cada secao tem botao "Expandir painel" que mostra mini-tabela com top 10 itens daquele filtro
5. Topo exibe "Ultima atualizacao: {hora}" e botao "Atualizar" para recarregar

---

## Detalhes Tecnicos

### 1. Reescrever `src/pages/Dashboard.tsx`

**Dados carregados (uma funcao `loadData`):**
- `leads`: todos os leads (id, nome_razao, status, last_contact_at, conversion_at, created_at, valor_potencial)
- `clients`: todos os clientes (id, nome_razao, status, patrimonio_ou_receita)
- `tasks`: todas as tarefas (id, status, due_at, related_type, related_id)
- `opportunities`: todas as oportunidades (id, titulo, stage, close_date, last_update_at, valor_estimado, created_at)

**Estado:**
- `lastUpdated`: Date - timestamp da ultima carga
- `loading`: boolean
- `expandedSection`: string | null - qual secao esta com mini-tabela aberta
- `expandedCard`: string | null - qual card esta com painel expandido

**Secao LEADS (5 cards):**

| Card | Calculo | Navegacao |
|------|---------|-----------|
| Leads Novos | leads com status="NOVO", contar | /leads?status=NOVO |
| Atividades Hoje | tasks com due_at=hoje e related_type="LEAD", contar leads unicos | /tarefas?related_type=LEAD&due=today |
| Sem Contato (30d) | leads com last_contact_at null OU > 30 dias, contar | /leads?filter=sem_contato |
| Convertidos Hoje | leads com conversion_at=hoje, contar | /leads?status=CONVERTIDO |
| Taxa de Conversao (90d) | leads com conversion_at nos ultimos 90d / leads criados nos ultimos 90d, exibir como % | Nao navega |

**Secao CLIENTES (5 cards):**

| Card | Calculo | Navegacao |
|------|---------|-----------|
| Ativos (NET) | status="ATIVO_NET", contar + somar patrimonio_ou_receita | /clientes?status=ATIVO_NET |
| Inativos (PLD) | status="INATIVO_PLD", contar + somar patrimonio_ou_receita | /clientes?status=INATIVO_PLD |
| Tarefas Atrasadas | tasks ATRASADA e related_type="CLIENT", contar clientes unicos | /tarefas?related_type=CLIENT&status=ATRASADA |
| Tarefas Hoje | tasks com due_at=hoje e related_type="CLIENT", contar clientes unicos | /tarefas?related_type=CLIENT&due=today |
| Criticos | status="CRITICO", contar + somar patrimonio_ou_receita | /clientes?status=CRITICO |

**Secao OPORTUNIDADES (5 cards):**

| Card | Calculo | Navegacao |
|------|---------|-----------|
| Iniciais | stage="INICIAL", contar + somar valor_estimado | /oportunidades?stage=INICIAL |
| Atrasadas | close_date < hoje e stage nao GANHA/PERDIDA, contar + somar valor_estimado | /oportunidades?filter=atrasadas |
| Sem Atualizacao (30d) | last_update_at < hoje-30d e stage nao GANHA/PERDIDA, contar | /oportunidades?filter=sem_atualizacao |
| Convertidas Hoje | stage="GANHA" e last_update_at=hoje, contar + somar valor_estimado | /oportunidades?stage=GANHA |
| Taxa de Conversao (90d) | ganhas nos 90d / (ganhas + perdidas nos 90d), exibir como % | Nao navega |

**Componente visual:**
- Usar Collapsible do shadcn para cada secao (Leads, Clientes, Oportunidades)
- Cada secao tem icone, titulo e contador total
- Dentro, grid 2x3 ou 3x2 de cards
- Cada card: titulo, valor principal (contador), subtitulo (valor em R$ quando aplicavel)
- Cards clicaveis com `useNavigate`
- Botao "Expandir painel" em cada card que mostra mini-tabela com top 10 registros (nome, status/stage, valor)
- Topo: titulo "Inicio", "Ultima atualizacao: HH:MM" e botao "Atualizar" com icone RefreshCw

**Mini-tabela (painel expandido):**
- Usa componente Table do shadcn
- Top 10 itens correspondentes ao filtro do card
- Colunas: Nome, Status/Stage, Valor, Data
- Linhas clicaveis navegando para detalhe (/leads/:id, /clientes/:id, /oportunidades/:id)

### 2. Atualizar paginas de lista para ler query params

Atualizar `Leads.tsx`, `Clientes.tsx`, `Oportunidades.tsx` para ler `searchParams` da URL e aplicar filtros iniciais:
- `?status=NOVO` -> seta statusFilter
- `?stage=INICIAL` -> seta stageFilter
- `?filter=sem_contato` -> filtra leads sem contato > 30 dias (filtro customizado)
- `?filter=atrasadas` -> filtra oportunidades com close_date < hoje

Usar `useSearchParams` do react-router-dom para ler os parametros na montagem.

### 3. Funcoes auxiliares de data

Adicionar em `src/lib/format.ts`:
- `isToday(date: string)`: verifica se uma data e hoje
- `isDaysAgo(date: string, days: number)`: verifica se uma data e anterior a N dias atras

---

## Arquivos modificados

- `src/pages/Dashboard.tsx` - reescrita completa
- `src/pages/Leads.tsx` - ler query params para filtros iniciais
- `src/pages/Clientes.tsx` - ler query params para filtros iniciais
- `src/pages/Oportunidades.tsx` - ler query params para filtros iniciais
- `src/lib/format.ts` - adicionar helpers isToday e isDaysAgo

## Nenhum arquivo novo necessario

## Nenhuma migracao de banco necessaria

