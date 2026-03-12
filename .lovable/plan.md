

# Aprimorar Importar Bases — Suporte a bases grandes e particionamento por mês

## Resumo

Reescrever `src/pages/ImportarBases.tsx` com parsing chunked, inserção com retry, particionamento por `mes_ano` para Base Receita, botão cancelar, progresso detalhado e suporte a `.xlsx/.xlsm/.xml`.

## Alterações

### 1. Migração SQL

Adicionar coluna `mes_ano_list` (text[]) à tabela `sync_logs` para registrar os períodos processados. Adicionar coluna `mes_ano` (text) às tabelas `raw_comissoes_historico` e `raw_comissoes_m0` para permitir delete parcial por período.

### 2. Reescrita de `src/pages/ImportarBases.tsx`

**Parser robusto:**
- Aceitar `.xml`, `.xlsx`, `.xlsm` no dropzone.
- Para `.xml`: `file.text()` + `XLSX.read(text, { type: "string" })`.
- Para `.xlsx/.xlsm`: `file.arrayBuffer()` + `XLSX.read(ab, { type: "array", cellDates: true })`.
- Nunca chamar `sheet_to_json` na aba inteira. Ler `sheet['!ref']`, iterar em chunks de 2000 linhas usando `XLSX.utils.sheet_to_json` com range limitado (`{ range: startRow, header: headers }`). Yield (`await new Promise(r => setTimeout(r, 0))`) entre chunks.

**Inserção com retry e progresso:**
- `BATCH_SIZE = 250`. Insert sequencial.
- Retry até 2x por batch com backoff de 500ms.
- Estado por arquivo: `{ rowsImported, totalRows, currentSheet, percentComplete, elapsedMs, estimatedRemainingMs, logs: string[] }`.
- Progress bar visual por arquivo (componente `Progress`).

**Particionamento por mês (Base Receita):**
- Configuração: `PARTITIONED_TABLES` = `{ raw_comissoes_historico: "Data", raw_comissoes_m0: "Data" }`.
- Durante parse de cada chunk, extrair coluna `Data`, converter para `YYYYMM` (`mes_ano`). Linhas sem data valida: log de warning, pular linha.
- Agrupar linhas por `mes_ano`.
- Para cada `mes_ano`: `delete from table where mes_ano = X`, depois insert batches.
- Inserir `mes_ano` como campo extra no objeto `{ data: row, mes_ano: "202501" }`.
- Fallback: tabelas não particionadas → delete total + insert (comportamento atual).

**Cancelamento:**
- `AbortController` ref. Botão "Cancelar" seta `aborted = true`.
- Checagem de abort entre batches e entre sheets.

**Logs na UI:**
- Array de log messages por arquivo, mostrado em collapsible abaixo da row do arquivo.
- Cada evento relevante (sheet encontrada, batch inserido, erro, retry, mes_ano processado) adiciona entrada ao log.

**sync_logs:**
- Status: `received` → `importing` → `success`/`partial`/`error`.
- `mes_ano_list`: array dos períodos processados (ex: `["202501","202502"]`).
- Update progressivo durante importação.

**Sugestão .xlsm:**
- Se erro no parse de `.xlsm`, exibir toast "Erro ao ler macro. Salve como .xlsx e tente novamente."

### 3. Arquivos

| Arquivo | Acao |
|---|---|
| Migracao SQL | Criar — add `mes_ano` to raw_comissoes_*, `mes_ano_list` to sync_logs |
| `src/pages/ImportarBases.tsx` | Reescrever completo |

