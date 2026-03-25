import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DashboardFilters } from "./useDashboardFilters";
import { useScopedDashboardParams } from "./useScopedDashboardParams";

// Custódia por Indexador (donut)
export function useCustodiaIndexador(filters: DashboardFilters) {
  const { effectiveParams: ep, ready } = useScopedDashboardParams(filters);
  const p = { p_banker: ep.p_banker, p_advisor: ep.p_advisor, p_finder: ep.p_finder, p_documento: ep.p_documento, p_tipo_cliente: ep.p_tipo_cliente };
  return useQuery({
    queryKey: ["custodia-indexador", p],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_custodia_indexador", p as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
    enabled: ready,
  });
}

// Custódia por Veículo (donut)
export function useCustodiaVeiculo(filters: DashboardFilters) {
  const { effectiveParams: ep, ready } = useScopedDashboardParams(filters);
  const p = { p_banker: ep.p_banker, p_advisor: ep.p_advisor, p_finder: ep.p_finder, p_documento: ep.p_documento, p_tipo_cliente: ep.p_tipo_cliente };
  return useQuery({
    queryKey: ["custodia-veiculo", p],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_custodia_veiculo", p as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
    enabled: ready,
  });
}

// Vencimentos bar chart (por produto)
export function useVencimentosGrafico(filters: DashboardFilters) {
  const { effectiveParams: ep, ready } = useScopedDashboardParams(filters);
  const p = { p_vencimento_inicio: null, p_vencimento_fim: null, p_banker: ep.p_banker, p_advisor: ep.p_advisor, p_finder: ep.p_finder, p_documento: ep.p_documento, p_tipo_cliente: ep.p_tipo_cliente };
  return useQuery({
    queryKey: ["vencimentos-grafico", p],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_vencimentos_grafico", p as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
    enabled: ready,
  });
}

// Tabela Todos os Ativos
export function useTodosAtivos(filters: DashboardFilters) {
  const { effectiveParams: ep, ready } = useScopedDashboardParams(filters);
  const p = { p_banker: ep.p_banker, p_advisor: ep.p_advisor, p_finder: ep.p_finder, p_documento: ep.p_documento, p_tipo_cliente: ep.p_tipo_cliente, p_limit: 500, p_offset: 0 };
  return useQuery({
    queryKey: ["todos-ativos", p],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_todos_ativos", p as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
    enabled: ready,
  });
}

// Tabela Vencimentos detalhado
export function useTabelaVencimentos(filters: DashboardFilters) {
  const { effectiveParams: ep, ready } = useScopedDashboardParams(filters);
  const p = { p_vencimento_inicio: null, p_vencimento_fim: null, p_banker: ep.p_banker, p_advisor: ep.p_advisor, p_finder: ep.p_finder, p_documento: ep.p_documento, p_tipo_cliente: ep.p_tipo_cliente };
  return useQuery({
    queryKey: ["tabela-vencimentos", p],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_tabela_vencimentos", p as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
    enabled: ready,
  });
}

// Tabela Clientes (Base CRM)
export function useTabelaClientes(filters: DashboardFilters) {
  const { effectiveParams: ep, ready } = useScopedDashboardParams(filters);
  const p = { p_banker: ep.p_banker, p_advisor: ep.p_advisor, p_documento: ep.p_documento, p_tipo_cliente: ep.p_tipo_cliente };
  return useQuery({
    queryKey: ["tabela-clientes", p],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_tabela_clientes", p as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
    enabled: ready,
  });
}

// AuC por Faixa de PL (combo bar+line)
export function useAucFaixaPl(filters: DashboardFilters) {
  const { effectiveParams: ep, ready } = useScopedDashboardParams(filters);
  const p = { p_banker: ep.p_banker, p_documento: ep.p_documento, p_tipo_cliente: ep.p_tipo_cliente };
  return useQuery({
    queryKey: ["auc-faixa-pl-qual", p],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_auc_faixa_pl_qualitativo", p as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
    enabled: ready,
  });
}

// ROA por Tipo de Cliente (linha por mês)
export function useRoaTipoCliente(filters: DashboardFilters) {
  const { effectiveParamsRoa: p, ready } = useScopedDashboardParams(filters);
  return useQuery({
    queryKey: ["roa-tipo-cliente", p],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_roa_tipo_cliente", p as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
    enabled: ready,
  });
}

// ROA por Faixa PL (linha por mês)
export function useRoaFaixaPl(filters: DashboardFilters) {
  const { effectiveParams: ep, ready } = useScopedDashboardParams(filters);
  const p = { p_banker: ep.p_banker, p_documento: ep.p_documento };
  return useQuery({
    queryKey: ["roa-faixa-pl", p],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_roa_faixa_pl", p as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
    enabled: ready,
  });
}

// ROA M0 tabela (por faixa PL x documento)
export function useRoaM0Tabela(filters: DashboardFilters) {
  const { effectiveParams: ep, ready } = useScopedDashboardParams(filters);
  const p = { p_banker: ep.p_banker, p_documento: ep.p_documento };
  return useQuery({
    queryKey: ["roa-m0-tabela", p],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_roa_m0_tabela", p as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
    enabled: ready,
  });
}

// Vencimentos por Ano (stacked bar)
export function useVencimentosPorAno(filters: DashboardFilters) {
  const { effectiveParams: ep, ready } = useScopedDashboardParams(filters);
  const p = { p_vencimento_inicio: null, p_vencimento_fim: null, p_banker: ep.p_banker, p_advisor: ep.p_advisor, p_finder: ep.p_finder, p_documento: ep.p_documento, p_tipo_cliente: ep.p_tipo_cliente };
  return useQuery({
    queryKey: ["vencimentos-por-ano", p],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_vencimentos_por_ano", p as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
    enabled: ready,
  });
}
