
# Modulo Contas (Clientes) - Lista e Detalhe

## Resumo

Evoluir a lista de Clientes com colunas tabulares, filtros adicionais (Banker, Assessor, Segmento), acoes rapidas inline (criar tarefa, adicionar nota, marcar como critico), e reescrever o detalhe do cliente com 4 abas customizadas incluindo aba de Oportunidades com vinculacao e criacao.

---

## O que muda para o usuario

1. Lista de contas passa de cards simples para uma tabela com colunas: Nome/Razao, Status, Banker, Assessor, Patrimonio/Receita, Ultimo contato, Proxima acao
2. Novos filtros: Banker, Assessor e Segmento (alem do Status ja existente)
3. Acoes rapidas em cada linha: "Criar tarefa", "Adicionar nota", "Marcar como critico" (ou desmarcar se ja for critico)
4. Detalhe do cliente ganha aba "Oportunidades" (substituindo "Anexos") com lista de oportunidades vinculadas, botao para vincular existente e botao para criar nova oportunidade ja associada ao cliente
5. Abas do detalhe: Resumo, Tarefas, Historico, Oportunidades

---

## Detalhes Tecnicos

### 1. Reescrever `src/pages/Clientes.tsx`

**Dados carregados:**
- `clients`: todos os clientes com campos completos
- `profiles`: lista de profiles (para resolver nomes de banker_id e assessor_id)

**Novos filtros (estados):**
- `bankerFilter`: string ("__all__" ou user_id) - dropdown com nomes de bankers
- `assessorFilter`: string ("__all__" ou user_id) - dropdown com nomes de assessores
- `segmentoFilter`: string ("__all__" ou valor) - dropdown com segmentos unicos extraidos dos clientes

**Layout da lista:**
- Substituir grid de Cards por componente Table do shadcn
- Colunas: Nome/Razao (clicavel para detalhe), Status (Badge), Banker (nome), Assessor (nome), Patrimonio (formatCurrency), Ultimo contato (formatDate de last_contact_at), Proxima acao (formatDate de next_action_at)
- Linha clicavel navega para `/clientes/:id`

**Acoes rapidas (coluna de acoes ou dropdown na linha):**
- Usar DropdownMenu do shadcn com 3 opcoes:
  - "Criar tarefa": abre Dialog com form simplificado (tipo, descricao, due_at) e insere task com related_type="CLIENT" e related_id=client.id
  - "Adicionar nota": abre Dialog com Textarea e insere nota com related_type="CLIENT" e related_id=client.id
  - "Marcar como critico" / "Desmarcar critico": toggle entre status atual e "CRITICO" (se ja for CRITICO, volta para ATIVO_NET)
- Botoes de acao param propagacao do click (e.stopPropagation) para nao navegar ao detalhe

**Filtros aplicados:**
- Status, Banker, Assessor e Segmento alem da busca textual existente

### 2. Reescrever `src/pages/ClienteDetalhe.tsx`

**Nao usar mais o `DetailLayout` generico** - criar layout customizado diretamente no componente para acomodar a aba de Oportunidades.

**Abas (4):**
1. **Resumo**: manter cards atuais de Informacoes Gerais e Dados Comerciais (copiar do atual)
2. **Tarefas**: lista de tasks com related_type="CLIENT" e related_id=id (copiar logica do DetailLayout)
3. **Historico**: timeline de notas com formulario para nova nota (copiar logica do DetailLayout)
4. **Oportunidades**: nova aba com:
   - Lista de oportunidades onde client_id = id (buscar da tabela opportunities)
   - Cada oportunidade mostra: titulo, stage (Badge), valor_estimado, close_date
   - Oportunidade clicavel navega para `/oportunidades/:id`
   - Botao "Nova Oportunidade": abre Dialog com form (titulo, valor_estimado, probabilidade, close_date, observacoes) e insere com client_id=id e owner_id=user.id
   - Botao "Vincular Existente": abre Dialog com Select/Combobox listando oportunidades sem client_id, ao selecionar faz update da oportunidade setando client_id=id

**Dados carregados:**
- client (por id)
- tasks (related_type="CLIENT", related_id=id)
- notes (related_type="CLIENT", related_id=id)
- opportunities (client_id=id)
- unlinkedOpportunities (client_id IS NULL, para o dialog de vincular)

### Arquivos modificados (2)

- `src/pages/Clientes.tsx` - reescrita com tabela, filtros, acoes rapidas
- `src/pages/ClienteDetalhe.tsx` - reescrita com 4 abas customizadas incluindo Oportunidades

### Nenhum arquivo novo

### Nenhuma migracao de banco necessaria

A tabela `opportunities` ja possui campo `client_id` (uuid nullable) que sera usado para vinculacao.
