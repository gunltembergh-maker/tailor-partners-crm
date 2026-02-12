

# Autenticacao e Perfis de Acesso (BANKER, FINDER, LIDER, ADMIN)

## Resumo

Evoluir o sistema de roles adicionando FINDER e ADMIN ao enum `app_role`, atualizar todas as politicas RLS para filtrar dados por responsavel (BANKER/FINDER veem apenas seus proprios registros, LIDER/ADMIN veem tudo), e ajustar o seletor "Ver como" para funcionar tambem para ADMIN. O cadastro nao permite escolha de perfil - os roles serao atribuidos via upload de base.

---

## O que muda para o usuario

1. Dois novos perfis disponiveis: FINDER e ADMIN
2. BANKER e FINDER so veem leads, clientes, oportunidades e tarefas onde sao responsaveis (owner, banker ou assessor)
3. LIDER e ADMIN veem todos os registros e podem usar o seletor "Ver como" na topbar
4. ADMIN tem acesso total (mesma visibilidade do LIDER por enquanto)
5. O cadastro continua sem selecao de perfil - roles serao atribuidos manualmente

---

## Detalhes Tecnicos

### 1. Migracao de banco de dados

**Adicionar valores ao enum `app_role`:**

```text
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'FINDER';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ADMIN';
```

**Criar funcao auxiliar `is_admin_or_lider`:**

Funcao SECURITY DEFINER que verifica se o usuario tem role LIDER ou ADMIN, usada nas politicas RLS.

**Atualizar politicas RLS SELECT em todas as tabelas de dados:**

- **leads**: trocar `true` por `is_admin_or_lider(auth.uid()) OR auth.uid() = owner_id OR auth.uid() = banker_id OR auth.uid() = assessor_id`
- **clients**: trocar `true` por `is_admin_or_lider(auth.uid()) OR auth.uid() = banker_id OR auth.uid() = assessor_id`
- **opportunities**: trocar `true` por `is_admin_or_lider(auth.uid()) OR auth.uid() = owner_id`
- **tasks**: trocar `true` por `is_admin_or_lider(auth.uid()) OR auth.uid() = owner_id`
- **notes**: manter `true` (notas sao contextuais e precisam ser visiveis para quem acessa o registro pai)

**Atualizar politica RLS em user_roles:**

- Adicionar politica SELECT para ADMIN poder ver todos os roles (similar ao LIDER existente)

**Atualizar trigger `handle_new_user`:**

- Nao atribuir role automaticamente no cadastro (remover INSERT em user_roles do trigger), ja que o usuario informou que vai subir uma base com os perfis

### 2. Atualizar `src/lib/format.ts`

Adicionar labels para os novos roles:

```text
roleLabels:
  ASSESSOR -> "Assessor"
  BANKER -> "Banker"
  FINDER -> "Finder"
  LIDER -> "Lider"
  ADMIN -> "Admin"
```

### 3. Atualizar `src/contexts/ViewAsContext.tsx`

- Mudar a condicao `isLider` para `isLiderOrAdmin` que verifica se role e "LIDER" ou "ADMIN"
- Usar essa flag para habilitar o seletor "Ver como" e o carregamento da lista de membros

### 4. Atualizar `src/components/AppLayout.tsx`

- Usar `isLiderOrAdmin` (renomeado de `isLider`) para exibir o seletor "Ver como"
- Nenhuma mudanca visual, apenas a logica de exibicao

### 5. Atualizar `src/hooks/useAuth.tsx`

- Ajustar `fetchRole` para tratar o caso onde o usuario nao tem role atribuido (retornar null graciosamente em vez de erro 406)
- Usar `.maybeSingle()` em vez de `.single()` para evitar erro quando nao ha linha

### 6. Nao alterar as paginas de dados

As paginas (Leads, Clientes, Oportunidades, Tarefas, Dashboard, Prioridades) continuam buscando todos os registros sem filtro no codigo. O RLS no banco de dados cuida automaticamente de restringir os dados retornados conforme o perfil do usuario.

---

## Arquivos modificados

- `src/lib/format.ts` - adicionar roleLabels para FINDER e ADMIN
- `src/contexts/ViewAsContext.tsx` - suportar ADMIN alem de LIDER
- `src/components/AppLayout.tsx` - usar isLiderOrAdmin
- `src/hooks/useAuth.tsx` - usar maybeSingle() no fetchRole

## Migracoes de banco

- Adicionar FINDER e ADMIN ao enum app_role
- Criar funcao is_admin_or_lider
- Atualizar politicas RLS SELECT em leads, clients, opportunities, tasks
- Adicionar politica SELECT em user_roles para ADMIN
- Atualizar trigger handle_new_user para nao atribuir role padrao

