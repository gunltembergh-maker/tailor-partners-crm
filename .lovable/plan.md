

# Fix: Perfil não persiste + botão cancelar pré-cadastro

## Problema 1 — Perfil não fica salvo

**Causa raiz**: A RPC `rpc_admin_salvar_usuario` grava `perfil_nome` na `team_reference`, mas para usuários já cadastrados (que existem na tabela `profiles`), ela **nunca atualiza `profiles.perfil_id`**. A listagem (`rpc_admin_lista_usuarios`) lê `perfis_acesso.nome` via `profiles.perfil_id` — como esse campo não é atualizado, o perfil aparece vazio.

**Correção**: Adicionar ao final da RPC um UPDATE que resolve o `perfil_id` a partir do nome do perfil:

```sql
UPDATE profiles SET
  perfil_id = (SELECT id FROM perfis_acesso WHERE nome = p_perfil_nome LIMIT 1),
  ...
WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email));
```

## Problema 2 — Botão de excluir/cancelar pré-cadastro

Atualmente o botão Trash (excluir) só aparece para `status === "Aguardando" && !user_id`. O usuário quer poder excluir qualquer pré-cadastro da `team_reference`, incluindo os que já se cadastraram.

**Correção no frontend**: Mostrar o botão de excluir para todos os registros na tabela (exceto possivelmente o próprio admin). Ao clicar, chamar `rpc_admin_remover_precadastro` que já existe e remove da `team_reference`.

## Arquivos alterados

1. **Migration SQL** — Recriar `rpc_admin_salvar_usuario` incluindo `UPDATE profiles SET perfil_id = ...`
2. **`src/pages/admin/GestaoUsuarios.tsx`** — Expandir condição do botão de excluir para aparecer em mais cenários

