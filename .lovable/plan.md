

# Novo Layout do Tailor CRM com identidade visual da marca

## Resumo

Reestruturar completamente o layout do CRM com topbar, sidebar expandida com 9 itens de menu, paginas de detalhe com abas, e ajustar a tipografia conforme o manual da marca (Roslindale para titulos, Source Sans Pro para corpo de texto). As cores ja estao alinhadas com o manual.

---

## O que muda para o usuario

1. **Topbar** fixa no topo com logo "Tailor CRM" (tipografia serif da marca), saudacao "Ola, {nome}" e seletor "Ver como" para usuarios com role LIDER
2. **Sidebar** expandida com 9 itens: Inicio, Prioridades, Leads, Contas, Tarefas, Calendario, Oportunidades, Paineis, Relatorios
3. **Tipografia** atualizada conforme manual da marca: Roslindale (via Google Fonts, substituido por Playfair Display que ja esta em uso - mantido) para titulos e Source Sans Pro para corpo de texto (substituindo Inter)
4. **Paginas de lista** padronizadas com filtros por status, ordenacao e cards clicaveis para detalhe
5. **Paginas de detalhe** com 4 abas: Resumo, Atividades/Tarefas, Historico (Timeline), Anexos (placeholder)
6. **Paginas placeholder** para: Prioridades, Calendario, Paineis, Relatorios

---

## Detalhes Tecnicos

### 1. Atualizar tipografia em `src/index.css`

Substituir a importacao da fonte Inter por Source Sans 3 (versao mais recente da Source Sans Pro no Google Fonts). Manter Playfair Display para titulos (substituto acessivel da Roslindale conforme o manual). Atualizar a classe `.font-sans` para usar Source Sans 3.

### 2. Atualizar `src/components/AppLayout.tsx`

Reestruturar o layout para incluir uma topbar fixa acima do conteudo:
- Topbar com: logo "Tailor" (font-display) + "CRM" (font-sans), saudacao "Ola, {nome}" usando dados do `useAuth`, seletor "Ver como" (dropdown) visivel apenas quando `role === "LIDER"`
- SidebarTrigger na topbar
- Criar um contexto `ViewAsContext` para compartilhar o `viewAsUserId` entre paginas (quando Lider seleciona outro usuario)

### 3. Atualizar `src/components/AppSidebar.tsx`

Expandir o array `menuItems` de 5 para 9 itens:
- Inicio (/) - Home
- Prioridades (/prioridades) - Star
- Leads (/leads) - Target
- Contas (/clientes) - Users (label muda de "Clientes" para "Contas")
- Tarefas (/tarefas) - CheckSquare
- Calendario (/calendario) - Calendar
- Oportunidades (/oportunidades) - Briefcase
- Paineis (/paineis) - BarChart3
- Relatorios (/relatorios) - FileText

Manter as informacoes do usuario e botao "Sair" no footer da sidebar.

### 4. Atualizar `src/App.tsx`

Adicionar 4 novas rotas protegidas:
- `/prioridades` -> Prioridades
- `/calendario` -> Calendario
- `/paineis` -> Paineis
- `/relatorios` -> Relatorios

Adicionar 3 rotas de detalhe:
- `/leads/:id` -> LeadDetalhe
- `/clientes/:id` -> ClienteDetalhe
- `/oportunidades/:id` -> OportunidadeDetalhe

### 5. Criar `src/components/DetailLayout.tsx`

Componente reutilizavel de detalhe com abas (usando shadcn Tabs):
- Props: titulo, subtitulo, onBack, e children para cada aba
- 4 abas: Resumo, Atividades/Tarefas, Historico (Timeline), Anexos
- Aba Historico: timeline vertical com notas da tabela `notes` (filtradas por `related_type` e `related_id`), com formulario para adicionar nova nota
- Aba Atividades: lista de tarefas filtradas por `related_type` e `related_id`
- Aba Anexos: placeholder "Em breve"

### 6. Criar paginas de detalhe

**`src/pages/LeadDetalhe.tsx`** (rota `/leads/:id`):
- Busca lead por ID
- Aba Resumo: campos editaveis (nome, email, telefone, segmento, porte, status, etc.)
- Aba Atividades: tarefas com `related_type = "LEAD"` e `related_id = id`
- Aba Historico: notas com `related_type = "LEAD"` e `related_id = id`

**`src/pages/ClienteDetalhe.tsx`** (rota `/clientes/:id`):
- Mesmo padrao, adaptado para campos de clientes

**`src/pages/OportunidadeDetalhe.tsx`** (rota `/oportunidades/:id`):
- Mesmo padrao, adaptado para campos de oportunidades

### 7. Criar 4 paginas placeholder

`src/pages/Prioridades.tsx`, `src/pages/Calendario.tsx`, `src/pages/Paineis.tsx`, `src/pages/Relatorios.tsx`:
- Cada uma com AppLayout + Card informando "Em breve"

### 8. Atualizar paginas de lista

**`src/pages/Leads.tsx`**, **`src/pages/Clientes.tsx`**, **`src/pages/Oportunidades.tsx`**:
- Adicionar filtro por status (dropdown ao lado da busca)
- Adicionar ordenacao (dropdown: mais recentes, mais antigos, nome A-Z)
- Tornar cards clicaveis com `useNavigate` para `/leads/:id`, `/clientes/:id`, `/oportunidades/:id`
- Cursor pointer no hover dos cards

### 9. Seletor "Ver como" (contexto de role)

Criar `src/contexts/ViewAsContext.tsx`:
- Estado `viewAsUserId` (null = visao propria)
- Funcao `setViewAs`
- Provido apenas quando role = LIDER
- Na topbar: dropdown que lista profiles + user_roles (consulta `profiles` e `user_roles`)
- Quando ativo, as paginas de lista filtram por `owner_id = viewAsUserId`

---

## Arquivos que serao criados (8)

- `src/pages/Prioridades.tsx`
- `src/pages/Calendario.tsx`
- `src/pages/Paineis.tsx`
- `src/pages/Relatorios.tsx`
- `src/pages/LeadDetalhe.tsx`
- `src/pages/ClienteDetalhe.tsx`
- `src/pages/OportunidadeDetalhe.tsx`
- `src/components/DetailLayout.tsx`
- `src/contexts/ViewAsContext.tsx`

## Arquivos que serao modificados (7)

- `src/index.css` - atualizar fonte sans para Source Sans 3
- `src/components/AppLayout.tsx` - adicionar topbar com saudacao e seletor "Ver como"
- `src/components/AppSidebar.tsx` - expandir menu para 9 itens
- `src/App.tsx` - adicionar 7 novas rotas + ViewAsProvider
- `src/pages/Leads.tsx` - filtros, ordenacao, cards clicaveis
- `src/pages/Clientes.tsx` - filtros, ordenacao, cards clicaveis
- `src/pages/Oportunidades.tsx` - filtros, ordenacao, cards clicaveis

## Nenhuma migracao de banco necessaria

Todas as tabelas necessarias (leads, clients, opportunities, tasks, notes, profiles, user_roles) ja existem com os campos corretos.

