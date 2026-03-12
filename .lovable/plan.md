

# Importar Bases — Tela Admin com Dropzone

## Resumo

Criar a página `/admin/importar-bases` com drag & drop de arquivos `.xml` (Excel XML), parsing no frontend via SheetJS, detecção automática de sourceKey pelo nome do arquivo, e importação direta nas tabelas RAW via Supabase client.

## Banco de dados

**Migração SQL:**
1. Criar tabela `raw_consolidado_receita` (mesma estrutura das outras raw: `id bigint`, `data jsonb`, `ingested_at timestamptz default now()`) com RLS permissivo para anon (DELETE, INSERT) e authenticated admins (SELECT).
2. Habilitar RLS e criar as políticas.

## Sidebar

**Arquivo:** `src/components/AppSidebar.tsx`
- Substituir o item admin "Importar Base" por "Importar Bases" apontando para `/admin/importar-bases`.
- Manter a seção Admin separada visualmente (SidebarGroup "Admin" com label).

## Rota

**Arquivo:** `src/App.tsx`
- Adicionar rota `/admin/importar-bases` -> novo componente `ImportarBases`.
- Manter a rota antiga `/import-clients` por compatibilidade.

## Página ImportarBases

**Arquivo:** `src/pages/ImportarBases.tsx`

Componente principal com:

### Dropzone
- Área de drag & drop aceitando `.xml`.
- Usa `<input type="file" accept=".xml" multiple />` com drag events.

### Detecção de sourceKey
- Normaliza nome do arquivo (lowercase, remove acentos via `normalize("NFD").replace(/[\u0300-\u036f]/g, "")`).
- Regras de match:
  - contém "captacao" → `captacao_total`
  - contém "base contas" ou "contas total" → `contas_total`
  - contém "depara" → `depara`
  - contém "diversificador" → `diversificador`
  - contém "positivador" → `positivador`
  - contém "base receita" → `base_receita`
  - contém "consolidado receita" → `consolidado_receita`
  - contém "mtm rf" ou "nps" → marcar como "ignorado"
  - senão → mostrar dropdown para escolher manualmente.

### Parsing
- Lê arquivo como texto (`FileReader.readAsText`).
- `XLSX.read(xmlText, { type: "string" })` para abrir.
- Lista abas encontradas.

### Importação
- Mapeamento sourceKey → abas → tabelas (inclui `consolidado_receita` mapeando primeira aba para `raw_consolidado_receita`, ou permitindo escolher).
- Para cada aba mapeada:
  1. `delete().gte('id', 0)` na tabela destino
  2. `XLSX.utils.sheet_to_json(sheet, { defval: null })` 
  3. Insert em batches de 500: `{ data: row }`
- Cria registro em `sync_logs` com sourceKey, fileName, status, rows_written.

### UI
- Lista de arquivos com: nome, sourceKey detectado (ou dropdown), status (pendente/importando/sucesso/erro/ignorado), linhas importadas, erro.
- Seção "Última importação" por sourceKey — query `sync_logs` ordenada por `received_at desc` agrupada por `source_key`.
- Usa `AppLayout` para manter sidebar/topbar.

### sourceKey → sheet → table map (consolidado)
```text
captacao_total:
  "Captação Total" → raw_captacao_total

contas_total:
  "Contas Total" → raw_contas_total

depara:
  "Base CRM" → raw_base_crm
  "DePara" → raw_depara

diversificador:
  "Diversificador Consolidado" → raw_diversificador_consolidado

positivador:
  "Ordem PL" → raw_ordem_pl
  "Positivador Total Desagrupado" → raw_positivador_total_desagrupado
  "Positivador Total Agrupado" → raw_positivador_total_agrupado
  "Positivador M0 Desagrupado" → raw_positivador_m0_desagrupado
  "Positivador M0 Agrupado" → raw_positivador_m0_agrupado

base_receita:
  "Comissões Histórico" → raw_comissoes_historico
  "Comissões" → raw_comissoes_m0

consolidado_receita:
  Primeira aba útil (ou escolha manual) → raw_consolidado_receita
```

## Arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| Migração SQL (raw_consolidado_receita + RLS) | Criar |
| `src/pages/ImportarBases.tsx` | Criar |
| `src/components/AppSidebar.tsx` | Editar — admin menu |
| `src/App.tsx` | Editar — adicionar rota |

