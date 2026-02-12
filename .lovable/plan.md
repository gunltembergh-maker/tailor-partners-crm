

# Plano: Campos completos da planilha na tela de Contas

## Objetivo
Adicionar todas as colunas da planilha que ainda nao foram importadas para o banco de dados, atualizar a funcao de importacao para gravar esses dados, e reorganizar a tela de detalhe do cliente com abas mais completas.

## Colunas faltantes da planilha

Os seguintes campos da planilha nao estao sendo armazenados hoje:

- **Cod do Cliente** (codigo_xp) - Codigo interno XP
- **PL Declarado** (pl_declarado) - Patrimonio declarado pelo cliente
- **Perfil** (perfil) - Perfil do investidor
- **Nascimento** (nascimento) - Data de nascimento
- **Cidade** (cidade) - Cidade
- **Estado** (estado) - Estado (UF)
- **Estado Civil** (estado_civil) - Estado civil
- **TAG** (tag) - Tag/classificacao
- **Endereco** (endereco) - Endereco completo
- **SoW** (sow) - Share of Wallet
- **Casa** (casa) - Casa/corretora de origem

## Etapas

### 1. Migrar banco de dados
Adicionar 11 novas colunas na tabela `clients`:

```text
codigo_xp       text
pl_declarado     numeric
perfil          text
nascimento      text
cidade          text
estado          text
estado_civil    text
tag             text
endereco        text
sow             text
casa            text
```

### 2. Atualizar funcao de importacao
Alterar `supabase/functions/import-clients/index.ts` para mapear todas as 20 colunas da planilha nos novos campos.

### 3. Atualizar os 769 registros existentes
Como os clientes ja foram importados sem esses campos, sera necessario re-importar ou executar um UPDATE com os dados da planilha. Orientar o usuario sobre como proceder (re-importar via a tela de importacao apos limpar os dados ou fazer upload novamente).

### 4. Reorganizar a tela de detalhe (ClienteDetalhe.tsx)
Manter as 4 abas existentes e expandir o conteudo da aba **Resumo** com cards organizados:

- **Card "Informacoes Gerais"**: Nome, Tipo, CPF/CNPJ, E-mail, Telefone, Nascimento, Estado Civil, Perfil
- **Card "Endereco"**: Endereco, Cidade, Estado
- **Card "Dados Comerciais"**: Status, Patrimonio (PL Tailor), PL Declarado, SoW, Segmento, Canal, Casa, Codigo XP, TAG
- **Card "Equipe Responsavel"**: Banker, Assessor, Finder
- **Card "Datas e Alertas"**: Criado em, Ultimo Contato, Proxima Acao, Risco/Alertas, Observacoes

### 5. Atualizar format.ts
Adicionar labels para novos campos como `perfilLabels` e `estadoCivilLabels` se necessario.

---

## Detalhes tecnicos

### Migracao SQL
```text
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS codigo_xp text,
  ADD COLUMN IF NOT EXISTS pl_declarado numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS perfil text,
  ADD COLUMN IF NOT EXISTS nascimento text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS estado_civil text,
  ADD COLUMN IF NOT EXISTS tag text,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS sow text,
  ADD COLUMN IF NOT EXISTS casa text;
```

### Mapeamento na funcao de importacao
```text
cols[0]  -> codigo_xp
cols[4]  -> pl_declarado (parseNumber)
cols[5]  -> perfil
cols[7]  -> nascimento
cols[8]  -> cidade
cols[9]  -> estado
cols[10] -> estado_civil
cols[12] -> tag
cols[13] -> endereco
cols[14] -> sow
cols[19] -> casa
```

### Arquivos modificados
- Nova migracao SQL (criacao de colunas)
- `supabase/functions/import-clients/index.ts` (mapeamento completo)
- `src/pages/ClienteDetalhe.tsx` (exibicao completa dos campos)
- `src/lib/format.ts` (labels auxiliares se necessario)

