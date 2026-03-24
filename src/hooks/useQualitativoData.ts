import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DashboardFilters } from "./useDashboardFilters";

function buildFilterParams(filters: DashboardFilters) {
  return {
    p_banker: filters.banker.length ? filters.banker : null,
    p_advisor: filters.advisor.length ? filters.advisor : null,
    p_finder: filters.finder.length ? filters.finder : null,
    p_documento: filters.documento ? [filters.documento] : null,
    p_tipo_cliente: filters.tipoCliente ? [filters.tipoCliente] : null,
  };
}

function buildRoaParams(filters: DashboardFilters) {
  return {
    p_banker: filters.banker.length ? filters.banker : null,
    p_documento: filters.documento ? [filters.documento] : null,
    p_tipo_cliente: filters.tipoCliente ? [filters.tipoCliente] : null,
  };
}

// Custódia por Indexador (donut)
export function useCustodiaIndexador(filters: DashboardFilters) {
  const p = buildFilterParams(filters);
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
  const p = buildFilterParams(filters);
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
  const p = buildFilterParams(filters);
  return useQuery({
    queryKey: ["vencimentos-grafico", p],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_vencimentos_grafico", {
        p_vencimento_inicio: null,
        p_vencimento_fim: null,
        ...p,
      } as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}

// Tabela Todos os Ativos
export function useTodosAtivos(filters: DashboardFilters) {
  const p = buildFilterParams(filters);
  return useQuery({
    queryKey: ["todos-ativos", p],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_todos_ativos", {
        ...p,
        p_limit: 500,
        p_offset: 0,
      } as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}

// Tabela Vencimentos detalhado
export function useTabelaVencimentos(filters: DashboardFilters) {
  const p = buildFilterParams(filters);
  return useQuery({
    queryKey: ["tabela-vencimentos", p],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_tabela_vencimentos", {
        p_vencimento_inicio: null,
        p_vencimento_fim: null,
        ...p,
      } as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}

// Tabela Clientes (Base CRM)
export function useTabelaClientes(filters: DashboardFilters) {
  const p = {
    p_banker: filters.banker.length ? filters.banker : null,
    p_advisor: filters.advisor.length ? filters.advisor : null,
    p_documento: filters.documento ? [filters.documento] : null,
    p_tipo_cliente: filters.tipoCliente ? [filters.tipoCliente] : null,
  };
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
  const p = {
    p_banker: filters.banker.length ? filters.banker : null,
    p_documento: filters.documento ? [filters.documento] : null,
    p_tipo_cliente: filters.tipoCliente ? [filters.tipoCliente] : null,
  };
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
  const p = buildRoaParams(filters);
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
  const p = {
    p_banker: filters.banker.length ? filters.banker : null,
    p_documento: filters.documento ? [filters.documento] : null,
  };
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
  const p = {
    p_banker: filters.banker.length ? filters.banker : null,
    p_documento: filters.documento ? [filters.documento] : null,
  };
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
  const p = buildFilterParams(filters);
  return useQuery({
    queryKey: ["vencimentos-por-ano", p],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_vencimentos_por_ano", {
        p_vencimento_inicio: null,
        p_vencimento_fim: null,
        ...p,
      } as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}
