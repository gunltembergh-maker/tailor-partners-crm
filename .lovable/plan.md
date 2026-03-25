
Objetivo: corrigir de forma definitiva os dados zerados para BANKER/FINDER/ASSESSOR no Dashboard Comercial, sem quebrar os filtros de ADMIN/LIDER.

1. Centralizar o “perfil resolvido” no auth
- Ajustar `src/hooks/useAuth.tsx` para expor, além de `role`, também os nomes corretos por papel:
  - `bankerName`
  - `advisorName`
  - `finderName`
- Hoje o código só guarda `perfil.banker_name`, e `useDashboardFilters` reutiliza esse valor para FINDER/ASSESSOR, o que é uma fragilidade real.
- Manter `loading` ativo até `rpc_meu_perfil` terminar, como já é a base do fluxo.

2. Tirar a dependência da UI para montar os filtros efetivos
- Em vez de confiar apenas em `appliedFilters` da sidebar, mover a lógica de “filtro forçado por role” para a camada de dados.
- Criar um helper compartilhado nos hooks de dashboard para montar params efetivos:
  - BANKER → `p_banker = [bankerName]`
  - ASSESSOR → `p_advisor = [advisorName]`
  - FINDER → `p_finder = [finderName]`
  - ADMIN/LIDER → usa o que vier dos filtros da UI, ou `null`
- Esse helper também deve devolver um `profileReady` efetivo para as queries.

3. Blindar todas as queries com `enabled`
- Hoje as páginas já fazem gate com `profileReady`, mas os hooks de dados continuam com `enabled` implícito e params montados só a partir de `filters`.
- Ajustar `src/hooks/useDashboardData.ts` e `src/hooks/useQualitativoData.ts` para:
  - usar o helper de params efetivos
  - incluir os filtros resolvidos na `queryKey`
  - definir `enabled: profileReady`
- Isso elimina a race condition no próprio nível da query e garante refetch quando o nome do usuário for resolvido.

4. Corrigir todas as RPCs afetadas
- Quantitativo em `src/hooks/useDashboardData.ts`:
  - `rpc_contas_kpis`
  - `rpc_contas_agg_mes`
  - `rpc_contas_total_por_tipo`
  - `rpc_captacao_kpis`
  - `rpc_captacao_agg_mes`
  - `rpc_captacao_treemap`
  - `rpc_auc_mes_stack_casa`
  - `rpc_auc_casa_m0`
  - `rpc_faixa_pl_clientes_mes`
  - `rpc_faixa_pl_auc_mes`
  - `rpc_receita_total`
  - `rpc_receita_mes_categoria`
  - `rpc_receita_treemap_categoria`
  - `rpc_receita_matriz_rows`
  - `rpc_receita_matriz_rows_cat`
  - `rpc_receita_drilldown`
- Qualitativo em `src/hooks/useQualitativoData.ts`:
  - `rpc_custodia_indexador`
  - `rpc_custodia_veiculo`
  - `rpc_todos_ativos`
  - `rpc_tabela_clientes`
  - `rpc_tabela_vencimentos`
  - `rpc_vencimentos_grafico`
  - `rpc_vencimentos_por_ano`
  - `rpc_roa_tipo_cliente`
  - `rpc_roa_faixa_pl`
  - `rpc_roa_m0_tabela`
  - `rpc_auc_faixa_pl_qualitativo`
- Importante: hoje algumas hooks qualitativas nem passam os 3 filtros sempre; isso será normalizado.

5. Ajustar o filtro visual da sidebar sem quebrar ADMIN/LIDER
- Em `src/hooks/useDashboardFilters.ts`, parar de reutilizar `bankerName` para todos os papéis.
- Usar:
  - `bankerName` para BANKER
  - `advisorName` para ASSESSOR
  - `finderName` para FINDER
- Em `src/components/dashboard/FiltersSidebar.tsx`:
  - BANKER: “Financial Advisor” pré-selecionado e bloqueado
  - ASSESSOR: “Advisor” pré-selecionado e bloqueado
  - FINDER: “Finder” pré-selecionado e bloqueado
  - ADMIN/LIDER: todos habilitados normalmente
- Preservar a lista de opções para ADMIN/LIDER; não reaplicar nenhuma lógica que esconda a lista de “Financial Advisor”.

6. Validar os pontos onde o dashboard é renderizado
- Revisar `src/pages/DashboardComercial.tsx` e `src/pages/QualitativoPage.tsx` para manter o gate atual por `profileReady`.
- O gate visual continua útil, mas a correção principal ficará na camada dos hooks para evitar qualquer query precoce ou cache errado.

Arquivos principais
- `src/hooks/useAuth.tsx`
- `src/hooks/useDashboardFilters.ts`
- `src/hooks/useDashboardData.ts`
- `src/hooks/useQualitativoData.ts`
- `src/components/dashboard/FiltersSidebar.tsx`
- `src/pages/DashboardComercial.tsx`
- `src/pages/QualitativoPage.tsx`

Resultado esperado
- ADMIN/LIDER: continuam vendo tudo e filtrando livremente.
- BANKER: todos os gráficos e tabelas já carregam filtrados pelo próprio `banker_name`.
- FINDER: tudo carrega pelo próprio `finder_name`.
- ASSESSOR: tudo carrega pelo próprio `advisor_name`.
- Nenhuma query crítica dispara com `null` antes do perfil estar pronto.
