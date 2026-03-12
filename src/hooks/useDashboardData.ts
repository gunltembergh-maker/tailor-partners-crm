import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DashboardFilters } from "./useDashboardFilters";

function anoMesRange(inicio: string, fim: string) {
  const s = inicio.replace(/-/g, "").slice(0, 6);
  const e = fim.replace(/-/g, "").slice(0, 6);
  return { s, e };
}

export function useSyncLogs() {
  return useQuery({
    queryKey: ["sync-logs-latest"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sync_logs")
        .select("source_key, received_at, status, rows_written")
        .order("received_at", { ascending: false })
        .limit(100);
      // dedupe: keep latest per source_key
      const map = new Map<string, (typeof data)[0]>();
      (data ?? []).forEach((r: any) => {
        if (!map.has(r.source_key)) map.set(r.source_key, r);
      });
      return Array.from(map.values());
    },
    staleTime: 60_000,
  });
}

export function useFilterOptions() {
  return useQuery({
    queryKey: ["dashboard-filter-options"],
    queryFn: async () => {
      // Fetch distinct values from vw_captacao_total
      const { data: captData } = await supabase
        .from("vw_captacao_total" as any)
        .select("banker, advisor, finder, casa, tipo_cliente")
        .limit(5000);
      
      const sets = {
        banker: new Set<string>(),
        advisor: new Set<string>(),
        finder: new Set<string>(),
        casa: new Set<string>(),
        tipoCliente: new Set<string>(),
      };
      (captData ?? []).forEach((r: any) => {
        if (r.banker) sets.banker.add(r.banker);
        if (r.advisor) sets.advisor.add(r.advisor);
        if (r.finder) sets.finder.add(r.finder);
        if (r.casa) sets.casa.add(r.casa);
        if (r.tipo_cliente) sets.tipoCliente.add(r.tipo_cliente);
      });
      return {
        bankers: [...sets.banker].sort(),
        advisors: [...sets.advisor].sort(),
        finders: [...sets.finder].sort(),
        casas: [...sets.casa].sort(),
        tiposCliente: [...sets.tipoCliente].sort(),
      };
    },
    staleTime: 5 * 60_000,
  });
}

export function useCaptacaoData(filters: DashboardFilters) {
  const { s, e } = anoMesRange(filters.periodoInicio, filters.periodoFim);
  return useQuery({
    queryKey: ["captacao", filters],
    queryFn: async () => {
      let q = supabase
        .from("vw_captacao_total" as any)
        .select("*")
        .gte("ano_mes", s)
        .lte("ano_mes", e);
      if (filters.documento) q = q.ilike("documento", `%${filters.documento}%`);
      if (filters.tipoCliente) q = q.eq("tipo_cliente", filters.tipoCliente);
      if (filters.casa) q = q.eq("casa", filters.casa);
      if (filters.banker.length) q = q.in("banker", filters.banker);
      if (filters.advisor.length) q = q.in("advisor", filters.advisor);
      if (filters.finder.length) q = q.in("finder", filters.finder);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    staleTime: 60_000,
  });
}

export function useContasData(filters: DashboardFilters) {
  const { s, e } = anoMesRange(filters.periodoInicio, filters.periodoFim);
  return useQuery({
    queryKey: ["contas", filters],
    queryFn: async () => {
      let q = supabase
        .from("vw_contas_total" as any)
        .select("*")
        .gte("ano_mes", s)
        .lte("ano_mes", e);
      if (filters.documento) q = q.ilike("documento", `%${filters.documento}%`);
      if (filters.tipoCliente) q = q.eq("tipo_cliente", filters.tipoCliente);
      if (filters.casa) q = q.eq("casa", filters.casa);
      if (filters.banker.length) q = q.in("banker", filters.banker);
      if (filters.advisor.length) q = q.in("advisor", filters.advisor);
      if (filters.finder.length) q = q.in("finder", filters.finder);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    staleTime: 60_000,
  });
}

export function usePositivadorData(filters: DashboardFilters) {
  const { s, e } = anoMesRange(filters.periodoInicio, filters.periodoFim);
  return useQuery({
    queryKey: ["positivador", filters],
    queryFn: async () => {
      let q = supabase
        .from("vw_positivador_total_agrupado" as any)
        .select("ano_mes, documento, banker, advisor, finder, casa, tipo_cliente, faixa_pl, ordem_pl, net_em_m, pl_declarado")
        .gte("ano_mes", s)
        .lte("ano_mes", e);
      if (filters.documento) q = q.ilike("documento", `%${filters.documento}%`);
      if (filters.tipoCliente) q = q.eq("tipo_cliente", filters.tipoCliente);
      if (filters.casa) q = q.eq("casa", filters.casa);
      if (filters.banker.length) q = q.in("banker", filters.banker);
      if (filters.advisor.length) q = q.in("advisor", filters.advisor);
      if (filters.finder.length) q = q.in("finder", filters.finder);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    staleTime: 60_000,
  });
}

export function useReceitaMensalData(filters: DashboardFilters) {
  const { s, e } = anoMesRange(filters.periodoInicio, filters.periodoFim);
  return useQuery({
    queryKey: ["receita-mensal", filters],
    queryFn: async () => {
      let q = supabase
        .from("vw_receita_mensal" as any)
        .select("*")
        .gte("mes_ano", s)
        .lte("mes_ano", e);
      if (filters.documento) q = q.ilike("documento", `%${filters.documento}%`);
      if (filters.tipoCliente) q = q.eq("tipo_cliente", filters.tipoCliente);
      if (filters.banker.length) q = q.in("banker", filters.banker);
      if (filters.advisor.length) q = q.in("advisor", filters.advisor);
      if (filters.finder.length) q = q.in("finder", filters.finder);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    staleTime: 60_000,
  });
}

export function useReceitaDetalhadaData(filters: DashboardFilters) {
  const { s, e } = anoMesRange(filters.periodoInicio, filters.periodoFim);
  return useQuery({
    queryKey: ["receita-detalhada", filters],
    queryFn: async () => {
      let q = supabase
        .from("vw_receita_detalhada" as any)
        .select("mes_ano, categoria, produto, comissao_bruta, banker, advisor, tipo_cliente")
        .gte("mes_ano", s)
        .lte("mes_ano", e);
      if (filters.documento) q = q.ilike("documento", `%${filters.documento}%`);
      if (filters.tipoCliente) q = q.eq("tipo_cliente", filters.tipoCliente);
      if (filters.banker.length) q = q.in("banker", filters.banker);
      if (filters.advisor.length) q = q.in("advisor", filters.advisor);
      if (filters.finder.length) q = q.in("finder", filters.finder);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    staleTime: 60_000,
  });
}

export function useDiversificadorData(filters: DashboardFilters) {
  return useQuery({
    queryKey: ["diversificador", filters],
    queryFn: async () => {
      let q = supabase
        .from("vw_diversificador_consolidado" as any)
        .select("documento, conta, banker, advisor, finder, casa, tipo_cliente, ativo_ajustado, produto_ajustado, indexador, net");
      if (filters.documento) q = q.ilike("documento", `%${filters.documento}%`);
      if (filters.tipoCliente) q = q.eq("tipo_cliente", filters.tipoCliente);
      if (filters.casa) q = q.eq("casa", filters.casa);
      if (filters.banker.length) q = q.in("banker", filters.banker);
      if (filters.advisor.length) q = q.in("advisor", filters.advisor);
      if (filters.finder.length) q = q.in("finder", filters.finder);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    staleTime: 60_000,
  });
}
