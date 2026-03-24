

# Atualização de Dependências com Vulnerabilidades

## Análise

O scan de segurança do projeto não inclui auditoria de dependências npm — ele cobre apenas problemas de RLS, edge functions e rotas (todos já corrigidos).

Porém, analisando o `package.json`, há duas dependências conhecidas por terem vulnerabilidades de alta severidade:

1. **`xlsx@0.18.5`** — O SheetJS Community Edition tem vulnerabilidades conhecidas de prototype pollution e arbitrary code execution. Esta é a principal preocupação.
2. **`jsdom@20.0.3`** (devDependency) — Versão antiga com vulnerabilidades transitivas conhecidas.

## Plano de Correção

### 1. Atualizar `jsdom` (devDependency)
- Atualizar de `^20.0.3` para `^25.0.1` (última versão estável)
- Impacto: apenas ambiente de teste, risco zero para produção

### 2. Avaliar `xlsx`
- O pacote `xlsx` (SheetJS CE) parou de receber patches de segurança na versão gratuita. A versão 0.18.5 é a última disponível no npm.
- **Opções**:
  - **A) Manter como está** — o pacote só é usado no client-side (`ImportClients.tsx`) e no edge function (`ingest-sharepoint-file`), ambos processando arquivos internos confiáveis
  - **B) Migrar para alternativa** como `exceljs` — requer refatoração significativa

### 3. Atualizar outras dependências menores
- Bump geral de patches/minor para todas as dependências via atualização do `package.json`

## Recomendação

Atualizar `jsdom` para v25 e fazer bump geral de patches. Para o `xlsx`, manter a versão atual dado que os inputs são controlados (arquivos internos da empresa), e a migração para `exceljs` seria um esforço separado maior.

## Arquivos a editar
- `package.json` — bump `jsdom` e demais dependências

