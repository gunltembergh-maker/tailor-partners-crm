

# Dashboard Comercial — Auto-refresh + Layout 1:1 com PBI

## Resumo

Duas frentes: (A) auto-refresh do dashboard após importação de bases, (B) ajustar layout Quantitativo e Qualitativo para reproduzir fielmente o PDF do Power BI.

---

## A. Auto-refresh após importação

### 1. Migração SQL
Criar tabela `dashboard_refresh` com uma única linha (id=1):
```sql
CREATE TABLE public.dashboard_refresh (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version int NOT NULL DEFAULT 0
);
INSERT INTO dashboard_refresh (id) VALUES (1);
ALTER TABLE dashboard_refresh ENABLE ROW LEVEL SECURITY;
-- Todos autenticados podem ler
CREATE POLICY "Anyone can read" ON dashboard_refresh FOR SELECT TO authenticated USING (true);
-- Admin/Lider pode atualizar
CREATE POLICY "Admin can update" ON dashboard_refresh FOR UPDATE TO authenticated
  USING (is_admin_or_lider(auth.uid()));
-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.dashboard_refresh;
```

### 2. `ImportarBases.tsx` — Sinal pós-importação
Após cada importação bem-sucedida (status `success` ou `partial`), chamar:
```ts
await supabase.rpc('increment_dashboard_refresh');
```
Criar function SQL `increment_dashboard_refresh` que faz `UPDATE dashboard_refresh SET version = version + 1, updated_at = now() WHERE id = 1`.

### 3. Hook `useDashboardRefresh`
- Subscrever a `dashboard_refresh` via Supabase Realtime (postgres_changes).
- Fallback: polling a cada 30s.
- Quando `version` mudar, chamar `queryClient.invalidateQueries()` para refetch de todos os dados.
- Expor `lastUpdatedAt` para exibir no topo.

### 4. UX no Dashboard
- Exibir "Dados atualizados em: DD/MM HH:mm" usando `dashboard_refresh.updated_at`.
- Quando invalidando queries, mostrar uma barra fina de loading no topo (não travar a página).

---

## B. Layout 1:1 com Power BI (baseado no PDF)

### Quantitativo (Page 1 do PDF)

Reescrever `QuantitativoTab.tsx` para reproduzir:

```text
Row 1: [Migração 450] [Habilitação 192] [Ativação 165] | [Total por Tipo - horizontal stacked bar by Casa]
Row 2: [Contas por mês - stacked bar (Ativação/Habilitação/Migração)]
Row 3: [Captação Líq MTD card] [Captação Líq YTD card]
Row 4: [Captação por mês - stacked bar com tipos (Câmbio,Cartão,COE,etc)] | [Tipo de Captação - donut]
Row 5: [AuC por mês - line chart multi-series por Casa] | [AuC por Casa - donut]
Row 6: [# Clientes por Faixa PL - stacked bar por mês]
Row 7: [AuC por Faixa PL - stacked bar por mês]
Row 8: [Receita Tailor - valor total card]
Row 9: [Receita Bruta tabela por Categoria x Mês]
Row 10: [Receita Bruta - stacked bar por mês] | [Receita por Categoria - donut]
```

Diferenças-chave vs. implementação atual:
- "Total por Tipo" é horizontal stacked bar (Casa: Avenue/XP/XP US), não existe hoje
- Contas por mês como stacked bar (Ativação/Habilitação/Migração) — novo gráfico
- Captação tem muitos tipos no stacked bar (Câmbio, Cartão, COE, Conversão, Galileo, Migração, Não Lista, Previdência, STVM, TED)
- AuC como line chart com múltiplas séries por Casa (Avenue, Gestora, Morgan Stanley, XP, XP US)
- AuC por Casa como donut (não bar horizontal)
- # Clientes por Faixa PL como stacked bar por mês (com faixas: Inativo, <300k, 300k-500k, 500k-1M, 1-3M, 3-5M, 5-10M, +10M)
- AuC por Faixa PL como stacked bar por mês
- Receita: tabela de Categoria x Mês + stacked bar + donut por categoria

### Qualitativo (Page 2 do PDF)

Reescrever `QualitativoTab.tsx`:

```text
Row 1: [Clientes - tabela (Documento, Conta, Saldo, Nome, PL Tailor, PL Declarado, SoW, Endereço, Banker, Advisor, Tipo)]
Row 2: [AuC por Faixa de PL - bar chart (NET + PL Declarado + Clientes)]
Row 3: [Custódia por Indexador - donut] | [Custódia por Veículo - donut]
Row 4: [Todos os Ativos - tabela (Documento, Conta, Ativo Ajustado, NET, Indexador, Veículo, Casa, Banker, Advisor, Tipo)]
Row 5: [Vencimentos - stacked bar por ano]
Row 6: [Vencimentos - tabela detalhada]
Row 7: [ROA Anualizado Ponderado - bar charts (PF vs PJ)] | [ROA Anualizado tabela]
Row 8: [ROA Anualizado Ponderado - bar chart por faixa PL]
```

Dados necessários:
- `vw_base_crm` para tabela Clientes (nome, documento, PL, SoW, Banker, Advisor)
- `vw_positivador_total_agrupado` para AuC por Faixa PL
- `vw_diversificador_consolidado` para Custódia, Ativos, Vencimentos
- `vw_receita_mensal`/`vw_receita_detalhada` para ROA

### Dados adicionais necessários
- Hook `useBaseCrmData(filters)` — novo, consulta `vw_base_crm`
- Adicionar filtro `vencimento` ao `DashboardFilters` (usado no Qualitativo)

---

## Arquivos

| Arquivo | Ação |
|---|---|
| Migração SQL | Criar — `dashboard_refresh` table + `increment_dashboard_refresh` function |
| `src/hooks/useDashboardRefresh.ts` | Criar — realtime listener + polling |
| `src/hooks/useDashboardData.ts` | Editar — add `useBaseCrmData` |
| `src/pages/ImportarBases.tsx` | Editar — increment dashboard_refresh após sucesso |
| `src/pages/DashboardComercial.tsx` | Editar — integrar refresh hook, loading bar, timestamp |
| `src/components/dashboard/QuantitativoTab.tsx` | Reescrever — layout PBI completo |
| `src/components/dashboard/QualitativoTab.tsx` | Reescrever — layout PBI completo |
| `src/hooks/useDashboardFilters.ts` | Editar — add campo vencimento |

