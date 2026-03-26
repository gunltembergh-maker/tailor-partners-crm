import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DashboardFilters } from "./useDashboardFilters";

/** All qualitativo RPCs now use the 6-param signature to avoid PostgREST ambiguity */
function buildFullParams(filters: DashboardFilters) {
  return {
    p_anomes: null as any,
    p_banker: filters.banker.length ? filters.banker : null,
    p_advisor: filters.advisor.length ? filters.advisor : null,
    p_finder: filters.finder.length ? filters.finder : null,
    p_documento: filters.documento ? [filters.documento] : null,
    p_tipo_cliente: filters.tipoCliente ? [filters.tipoCliente] : null,
  };
}

/** Vencimentos RPCs now use the same 6-param signature as all others */
function buildVencParams(filters: DashboardFilters) {
  return buildFullParams(filters);
}

// Custódia por Indexador (donut)
export function useCustodiaIndexador(filters: DashboardFilters) {
  const p = buildFullParams(filters);
  return useQuery({
    queryKey: ["custodia-indexador", p],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_custodia_indexador", p as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}

// Custódia por Veículo (donut)
export function useCustodiaVeiculo(filters: DashboardFilters) {
  const p = buildFullParams(filters);
  return useQuery({
    queryKey: ["custodia-veiculo", p],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_custodia_veiculo", p as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}

// Vencimentos bar chart (por produto)
export function useVencimentosGrafico(filters: DashboardFilters) {
  const p = buildVencParams(filters);
  return useQuery({
    queryKey: ["vencimentos-grafico", p],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_vencimentos_grafico", p as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}

// Tabela Todos os Ativos
export function useTodosAtivos(filters: DashboardFilters) {
  const p = buildFullParams(filters);
  return useQuery({
    queryKey: ["todos-ativos", p],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_todos_ativos", p as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}

// Tabela Vencimentos detalhado
export function useTabelaVencimentos(filters: DashboardFilters) {
  const p = buildVencParams(filters);
  return useQuery({
    queryKey: ["tabela-vencimentos", p],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_tabela_vencimentos", p as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}

// Tabela Clientes (Base CRM)
export function useTabelaClientes(filters: DashboardFilters) {
  const p = buildFullParams(filters);
  return useQuery({
    queryKey: ["tabela-clientes", p],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_tabela_clientes", p as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}

// AuC por Faixa de PL (combo bar+line)
export function useAucFaixaPl(filters: DashboardFilters) {
  const p = buildFullParams(filters);
  return useQuery({
    queryKey: ["auc-faixa-pl-qual", p],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_auc_faixa_pl_qualitativo", p as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}

// ROA por Tipo de Cliente (linha por mês)
export function useRoaTipoCliente(filters: DashboardFilters) {
  const p = buildFullParams(filters);
  return useQuery({
    queryKey: ["roa-tipo-cliente", p],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_roa_tipo_cliente", p as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}

// ROA por Faixa PL (linha por mês)
export function useRoaFaixaPl(filters: DashboardFilters) {
  const p = buildFullParams(filters);
  return useQuery({
    queryKey: ["roa-faixa-pl", p],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_roa_faixa_pl", p as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}

// ROA M0 tabela (por faixa PL x documento)
export function useRoaM0Tabela(filters: DashboardFilters) {
  const p = buildFullParams(filters);
  return useQuery({
    queryKey: ["roa-m0-tabela", p],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_roa_m0_tabela", p as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}

// Vencimentos por Ano (stacked bar)
export function useVencimentosPorAno(filters: DashboardFilters) {
  const p = buildVencParams(filters);
  return useQuery({
    queryKey: ["vencimentos-por-ano", p],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_vencimentos_por_ano", p as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}
