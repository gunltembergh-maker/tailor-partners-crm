-- Make all dashboard RPCs SECURITY DEFINER so non-admin users (Banker, Assessor, Finder)
-- can access data through RPCs which already apply correct filtering via get_user_*_filter().
-- RLS on raw_* tables remains restrictive for direct access.

ALTER FUNCTION public.rpc_captacao_kpis SET search_path = 'public';
ALTER FUNCTION public.rpc_captacao_kpis SECURITY DEFINER;

ALTER FUNCTION public.rpc_captacao_agg_mes SET search_path = 'public';
ALTER FUNCTION public.rpc_captacao_agg_mes SECURITY DEFINER;

ALTER FUNCTION public.rpc_captacao_treemap SET search_path = 'public';
ALTER FUNCTION public.rpc_captacao_treemap SECURITY DEFINER;

ALTER FUNCTION public.rpc_contas_kpis SET search_path = 'public';
ALTER FUNCTION public.rpc_contas_kpis SECURITY DEFINER;

ALTER FUNCTION public.rpc_contas_agg_mes SET search_path = 'public';
ALTER FUNCTION public.rpc_contas_agg_mes SECURITY DEFINER;

ALTER FUNCTION public.rpc_contas_total_por_tipo SET search_path = 'public';
ALTER FUNCTION public.rpc_contas_total_por_tipo SECURITY DEFINER;

ALTER FUNCTION public.rpc_auc_casa SET search_path = 'public';
ALTER FUNCTION public.rpc_auc_casa SECURITY DEFINER;

ALTER FUNCTION public.rpc_auc_casa_m0 SET search_path = 'public';
ALTER FUNCTION public.rpc_auc_casa_m0 SECURITY DEFINER;

ALTER FUNCTION public.rpc_auc_mes SET search_path = 'public';
ALTER FUNCTION public.rpc_auc_mes SECURITY DEFINER;

ALTER FUNCTION public.rpc_auc_mes_stack_casa SET search_path = 'public';
ALTER FUNCTION public.rpc_auc_mes_stack_casa SECURITY DEFINER;

ALTER FUNCTION public.rpc_faixa_pl_auc SET search_path = 'public';
ALTER FUNCTION public.rpc_faixa_pl_auc SECURITY DEFINER;

ALTER FUNCTION public.rpc_faixa_pl_auc_mes SET search_path = 'public';
ALTER FUNCTION public.rpc_faixa_pl_auc_mes SECURITY DEFINER;

ALTER FUNCTION public.rpc_faixa_pl_clientes SET search_path = 'public';
ALTER FUNCTION public.rpc_faixa_pl_clientes SECURITY DEFINER;

ALTER FUNCTION public.rpc_faixa_pl_clientes_mes SET search_path = 'public';
ALTER FUNCTION public.rpc_faixa_pl_clientes_mes SECURITY DEFINER;

ALTER FUNCTION public.rpc_receita_total SET search_path = 'public';
ALTER FUNCTION public.rpc_receita_total SECURITY DEFINER;

ALTER FUNCTION public.rpc_receita_mes_categoria SET search_path = 'public';
ALTER FUNCTION public.rpc_receita_mes_categoria SECURITY DEFINER;

ALTER FUNCTION public.rpc_receita_treemap_categoria SET search_path = 'public';
ALTER FUNCTION public.rpc_receita_treemap_categoria SECURITY DEFINER;

ALTER FUNCTION public.rpc_receita_matriz_rows SET search_path = 'public';
ALTER FUNCTION public.rpc_receita_matriz_rows SECURITY DEFINER;

ALTER FUNCTION public.rpc_receita_matriz_rows_cat SET search_path = 'public';
ALTER FUNCTION public.rpc_receita_matriz_rows_cat SECURITY DEFINER;

ALTER FUNCTION public.rpc_receita_drilldown SET search_path = 'public';
ALTER FUNCTION public.rpc_receita_drilldown SECURITY DEFINER;

ALTER FUNCTION public.rpc_roa_geral SET search_path = 'public';
ALTER FUNCTION public.rpc_roa_geral SECURITY DEFINER;

ALTER FUNCTION public.rpc_custodia_indexador SET search_path = 'public';
ALTER FUNCTION public.rpc_custodia_indexador SECURITY DEFINER;

ALTER FUNCTION public.rpc_custodia_veiculo SET search_path = 'public';
ALTER FUNCTION public.rpc_custodia_veiculo SECURITY DEFINER;

ALTER FUNCTION public.rpc_auc_faixa_pl_qualitativo SET search_path = 'public';
ALTER FUNCTION public.rpc_auc_faixa_pl_qualitativo SECURITY DEFINER;

ALTER FUNCTION public.rpc_roa_tipo_cliente SET search_path = 'public';
ALTER FUNCTION public.rpc_roa_tipo_cliente SECURITY DEFINER;

ALTER FUNCTION public.rpc_roa_faixa_pl SET search_path = 'public';
ALTER FUNCTION public.rpc_roa_faixa_pl SECURITY DEFINER;

ALTER FUNCTION public.rpc_roa_m0_tabela SET search_path = 'public';
ALTER FUNCTION public.rpc_roa_m0_tabela SECURITY DEFINER;

ALTER FUNCTION public.rpc_tabela_clientes SET search_path = 'public';
ALTER FUNCTION public.rpc_tabela_clientes SECURITY DEFINER;

ALTER FUNCTION public.rpc_tabela_vencimentos SET search_path = 'public';
ALTER FUNCTION public.rpc_tabela_vencimentos SECURITY DEFINER;

ALTER FUNCTION public.rpc_todos_ativos SET search_path = 'public';
ALTER FUNCTION public.rpc_todos_ativos SECURITY DEFINER;

ALTER FUNCTION public.rpc_vencimentos_grafico SET search_path = 'public';
ALTER FUNCTION public.rpc_vencimentos_grafico SECURITY DEFINER;

ALTER FUNCTION public.rpc_vencimentos_por_ano SET search_path = 'public';
ALTER FUNCTION public.rpc_vencimentos_por_ano SECURITY DEFINER;

ALTER FUNCTION public.rpc_filtro_anomes SET search_path = 'public';
ALTER FUNCTION public.rpc_filtro_anomes SECURITY DEFINER;

ALTER FUNCTION public.rpc_filtro_financial_advisors SET search_path = 'public';
ALTER FUNCTION public.rpc_filtro_financial_advisors SECURITY DEFINER;

ALTER FUNCTION public.rpc_filtro_finders SET search_path = 'public';
ALTER FUNCTION public.rpc_filtro_finders SECURITY DEFINER;

ALTER FUNCTION public.rpc_dashboard_timestamps SET search_path = 'public';
ALTER FUNCTION public.rpc_dashboard_timestamps SECURITY DEFINER;