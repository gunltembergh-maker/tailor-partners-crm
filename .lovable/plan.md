

# Consulta de CNPJ gratuita via BrasilAPI

## Resumo

Implementar consulta automatica de CNPJ usando a API gratuita BrasilAPI, com enriquecimento automatico dos dados do lead PJ. CPF permanece manual.

---

## O que muda para o usuario

1. Ao selecionar **PJ**, aparece o campo CNPJ com um botao **"Consultar"**
2. Ao clicar, os dados da empresa sao preenchidos automaticamente: Razao Social, E-mail, Telefone, Segmento e Porte
3. O usuario pode editar os dados antes de salvar
4. Ao selecionar **PF**, o campo CPF aparece para digitacao manual (sem consulta)
5. Campo **Porte** (Pequeno, Medio, Grande) aparece apenas para PJ

---

## Detalhes Tecnicos

### 1. Edge Function `consulta-cnpj`

Criar `supabase/functions/consulta-cnpj/index.ts`:
- Recebe `{ cnpj: "12345678000190" }` via POST
- Remove caracteres nao numericos e valida 14 digitos
- Chama `https://brasilapi.com.br/api/cnpj/v1/{cnpj}`
- Retorna JSON com: razao_social, email, telefone, atividade_principal (descricao), porte, uf, municipio
- Mapeia porte da API (MEI, ME, EPP, DEMAIS) para os valores do sistema (PEQUENO, MEDIO, GRANDE)
- Headers CORS inclusos

### 2. Migracao SQL

Adicionar coluna `porte` (texto, nullable) na tabela `leads`.

### 3. Atualizar `src/pages/Leads.tsx`

- Adicionar `porte` e `isSearching` ao estado do formulario
- Quando `tipo_pessoa = "PJ"`:
  - Campo CNPJ com botao "Consultar" ao lado (com loading spinner)
  - Ao consultar com sucesso, preencher automaticamente: `nome_razao`, `email`, `telefone`, `segmento`, `porte`
  - Mostrar select de Porte (Pequeno, Medio, Grande)
- Quando `tipo_pessoa = "PF"`:
  - Campo CPF para digitacao manual
  - Sem botao de consulta, sem campo Porte
- Incluir `porte` no insert ao banco
- Exibir porte na listagem para leads PJ

### 4. Atualizar `src/lib/format.ts`

Adicionar:
- `porteLabels`: { PEQUENO: "Pequeno", MEDIO: "Medio", GRANDE: "Grande" }

### 5. Atualizar `supabase/config.toml`

Adicionar configuracao da nova edge function com `verify_jwt = false`.

