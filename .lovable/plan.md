

# Migrar de `xlsx` para `exceljs`

## Contexto
O pacote `xlsx@0.18.5` (SheetJS CE) possui vulnerabilidades conhecidas de Prototype Pollution e ReDoS. Será substituído pelo `exceljs`, que é mantido ativamente.

## Arquivos afetados

### 1. `package.json`
- Remover `xlsx` das dependencies
- Adicionar `exceljs`

### 2. `src/pages/ImportarBases.tsx` (maior impacto)
- Trocar `import * as XLSX from "xlsx"` por `import ExcelJS from "exceljs"`
- Substituir `XLSX.read(buffer)` por `new ExcelJS.Workbook().xlsx.load(buffer)`
- Substituir `XLSX.utils.sheet_to_json()` por iteração manual das rows do ExcelJS (`.eachRow()`)
- A função `readSheet()` será reescrita para converter rows do ExcelJS em `Record<string, unknown>[]` usando o header da primeira linha como chaves
- Manter toda a lógica de normalização de datas e valores existente

### 3. `src/pages/ImportClients.tsx`
- Mesma troca de imports
- Substituir `XLSX.read` + `sheet_to_json` pela API do ExcelJS
- Lógica de mapeamento de colunas permanece igual

### 4. `supabase/functions/ingest-sharepoint-file/index.ts`
- Trocar `import * as XLSX from "npm:xlsx@0.18.5"` por `import ExcelJS from "npm:exceljs"`
- Adaptar `XLSX.read(fileBytes)` para `new ExcelJS.Workbook().xlsx.load(buffer)`
- Adaptar `sheet_to_json` para iteração manual de rows
- Adaptar `findSheet()` para usar `workbook.worksheets` e `worksheet.name`

## Diferenças de API principais

```text
xlsx (antes)                          exceljs (depois)
─────────────────────────────────────────────────────────
XLSX.read(buf, {type:"array"})     →  wb.xlsx.load(buf)
workbook.SheetNames                →  wb.worksheets.map(ws => ws.name)
workbook.Sheets[name]              →  wb.getWorksheet(name)
XLSX.utils.sheet_to_json(ws)       →  iteração manual com ws.eachRow()
```

## Helper `sheetToJson` (novo)
Será criada uma função utilitária que replica o comportamento de `sheet_to_json`:
- Primeira row = headers (chaves do objeto)
- Demais rows = valores mapeados por coluna
- Células vazias → `null`

## Risco
- Baixo: a API do ExcelJS é bem documentada e amplamente usada
- A lógica de negócio (mapeamento de colunas, truncate-and-insert, batching) não muda

