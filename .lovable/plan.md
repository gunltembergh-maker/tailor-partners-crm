
# Reestruturar Banco de Dados do CRM Tailor Partners

## Resumo

Recriar as tabelas do banco de dados com o novo schema solicitado, substituindo as tabelas existentes. Inclui novos enums, nova tabela de notas/timeline, trigger para atualizar `last_contact_at`, e atualizar todo o codigo frontend para refletir os novos campos.

---

## Etapa 1 -- Migracao SQL

Dropar tabelas e enums antigos e recriar tudo do zero com o novo schema:

### Novos Enums
- `user_role`: ASSESSOR, BANKER, LIDER
- `tipo_pessoa`: PF, PJ
- `lead_status`: NOVO, CONTATO_INICIADO, QUALIFICADO, REUNIAO, PROPOSTA, CONVERTIDO, PERDIDO
- `client_status`: ATIVO_NET, INATIVO_PLD, CRITICO
- `opportunity_stage`: INICIAL, EM_ANDAMENTO, NEGOCIACAO, GANHA, PERDIDA
- `task_tipo`: LIGACAO, WHATSAPP, EMAIL, REUNIAO, POS_VENDA, OUTRO
- `task_status`: ABERTA, CONCLUIDA, ATRASADA
- `related_type`: LEAD, CLIENT, OPPORTUNITY

### Tabelas (todas com created_at / updated_at + trigger auto-update)

**profiles** (mantida, com role adicionado):
- Mantemos a tabela `profiles` que ja existe vinculada ao auth, mas adicionamos o campo `role` (user_role) e `active` (boolean default true)

**leads**: id, tipo_pessoa, nome_razao, cpf_cnpj, email, telefone, canal_origem, status, valor_potencial, segmento, score, owner_id, banker_id, assessor_id, last_contact_at, next_action_at, conversion_at, observacoes, created_at, updated_at

**clients**: id, tipo_pessoa, nome_razao, cpf_cnpj, email, telefone, status, patrimonio_ou_receita, segmento, risco_ou_alertas, banker_id, assessor_id, last_contact_at, next_action_at, observacoes, created_at, updated_at

**opportunities**: id, titulo, origem, lead_id, client_id, stage, valor_estimado, probabilidade, close_date, last_update_at, owner_id, observacoes, created_at, updated_at

**tasks**: id, tipo, status, due_at, done_at, related_type, related_id, owner_id, descricao, created_at, updated_at

**notes** (nova): id, related_type, related_id, author_id, texto, created_at

### Trigger: ao concluir task
- Quando `tasks.status` muda para `CONCLUIDA`, atualizar `last_contact_at` no lead ou client relacionado (conforme `related_type`)
- Tambem setar `done_at = now()`

### RLS Policies
- Mesma estrategia atual: SELECT liberado para autenticados, INSERT com created_by/owner_id = auth.uid(), UPDATE para owner/assigned, DELETE para admin/gerente (agora LIDER)
- Adaptadas para o novo campo `role` na tabela profiles usando funcao `has_role` atualizada

---

## Etapa 2 -- Atualizar `src/lib/format.ts`

Substituir todos os labels e cores para os novos enums:
- `leadStatusLabels` com os 7 novos status
- `clientStatusLabels` (ATIVO_NET, INATIVO_PLD, CRITICO)
- `opportunityStageLabels` com 5 novos stages
- `taskTipoLabels` (LIGACAO, WHATSAPP, etc.)
- `taskStatusLabels` (ABERTA, CONCLUIDA, ATRASADA)
- `canalOrigemLabels` (Site, WhatsApp, Indicacao, Evento, Outro)
- Cores correspondentes para badges

---

## Etapa 3 -- Atualizar Paginas Frontend

### `Leads.tsx`
- Formulario com campos: tipoPessoa (PF/PJ), nomeRazao, cpfCnpj, email, telefone, canalOrigem (select), valorPotencial, segmento, score, observacoes
- Listagem exibindo os novos campos
- Select de status com novos valores

### `Clientes.tsx`
- Formulario com: tipoPessoa, nomeRazao, cpfCnpj, email, telefone, status, patrimonioOuReceita, segmento, riscoOuAlertas, observacoes
- Listagem com badges de status (ATIVO_NET, INATIVO_PLD, CRITICO)

### `Oportunidades.tsx`
- Formulario com: titulo, origem (LEAD/CLIENT), leadId/clientId (selects dinamicos), stage, valorEstimado, probabilidade, closeDate, observacoes
- Novos stages no select

### `Tarefas.tsx`
- Formulario com: tipo (LIGACAO, WHATSAPP, etc.), descricao, dueAt, relatedType + relatedId (selects dinamicos)
- Remover conceito de "prioridade" (nao esta no novo schema)
- Status: ABERTA, CONCLUIDA, ATRASADA

### `Dashboard.tsx`
- Adaptar queries para novos nomes de colunas (valor_potencial, valor_estimado, etc.)
- Adaptar filtros de stages/status

---

## Etapa 4 -- Atualizar `useAuth.tsx` e `AppSidebar.tsx`

- Buscar `role` do profile para exibir no sidebar
- Preparar para controle de permissoes por role no futuro

---

## Detalhes Tecnicos

A migracao vai:
1. Dropar tabelas existentes (leads, clients, opportunities, tasks, user_roles) em cascata
2. Dropar enums antigos
3. Recriar enums novos
4. Recriar tabelas com novos schemas e foreign keys para profiles
5. Adicionar role e active na tabela profiles
6. Criar trigger `on_task_completed` que atualiza last_contact_at
7. Recriar triggers de updated_at
8. Recriar RLS policies
9. Atualizar funcao `has_role` para usar campo role da tabela profiles

Todo o frontend sera atualizado para refletir os novos nomes de colunas e valores de enum.
