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
      const { data: captData } = await supabase
        .from("vw_captacao_total" as any)
        .select("banker, advisor, finder, casa, tipo_cliente, ano_mes")
        .limit(5000);
      
      const sets = {
        banker: new Set<string>(),
        advisor: new Set<string>(),
        finder: new Set<string>(),
        casa: new Set<string>(),
        tipoCliente: new Set<string>(),
        anoMes: new Set<string>(),
      };
      (captData ?? []).forEach((r: any) => {
        if (r.banker) sets.banker.add(r.banker);
        if (r.advisor) sets.advisor.add(r.advisor);
        if (r.finder) sets.finder.add(r.finder);
        if (r.casa) sets.casa.add(r.casa);
        if (r.tipo_cliente) sets.tipoCliente.add(r.tipo_cliente);
        if (r.ano_mes) sets.anoMes.add(r.ano_mes);
      });
      return {
        bankers: [...sets.banker].sort(),
        advisors: [...sets.advisor].sort(),
        finders: [...sets.finder].sort(),
        casas: [...sets.casa].sort(),
        tiposCliente: [...sets.tipoCliente].sort(),
        anoMeses: [...sets.anoMes].sort(),
      };
    },
    staleTime: 5 * 60_000,
  });
}

function applyCommonFilters(q: any, filters: DashboardFilters, dateCol: string) {
  if (filters.anoMes.length) {
    q = q.in(dateCol, filters.anoMes);
  } else {
    const { s, e } = anoMesRange(filters.periodoInicio, filters.periodoFim);
    q = q.gte(dateCol, s).lte(dateCol, e);
  }
  if (filters.documento) q = q.ilike("documento", `%${filters.documento}%`);
  if (filters.tipoCliente) q = q.eq("tipo_cliente", filters.tipoCliente);
  if (filters.casa) q = q.eq("casa", filters.casa);
  if (filters.banker.length) q = q.in("banker", filters.banker);
  if (filters.advisor.length) q = q.in("advisor", filters.advisor);
  if (filters.finder.length) q = q.in("finder", filters.finder);
  return q;
}

export function useCaptacaoData(filters: DashboardFilters) {
  return useQuery({
    queryKey: ["captacao", filters],
    queryFn: async () => {
      let q = supabase.from("vw_captacao_total" as any).select("*");
      q = applyCommonFilters(q, filters, "ano_mes");
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    staleTime: 60_000,
  });
}

export function useContasData(filters: DashboardFilters) {
  return useQuery({
    queryKey: ["contas", filters],
    queryFn: async () => {
      let q = supabase.from("vw_contas_total" as any).select("*");
      q = applyCommonFilters(q, filters, "ano_mes");
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    staleTime: 60_000,
  });
}

export function usePositivadorData(filters: DashboardFilters) {
  return useQuery({
    queryKey: ["positivador", filters],
    queryFn: async () => {
      let q = supabase
        .from("vw_positivador_total_agrupado" as any)
        .select("ano_mes, documento, banker, advisor, finder, casa, tipo_cliente, faixa_pl, ordem_pl, net_em_m, pl_declarado, conta");
      q = applyCommonFilters(q, filters, "ano_mes");
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    staleTime: 60_000,
  });
}

export function useReceitaMensalData(filters: DashboardFilters) {
  return useQuery({
    queryKey: ["receita-mensal", filters],
    queryFn: async () => {
      let q = supabase.from("vw_receita_mensal" as any).select("*");
      q = applyCommonFilters(q, filters, "mes_ano");
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    staleTime: 60_000,
  });
}

export function useReceitaDetalhadaData(filters: DashboardFilters) {
  return useQuery({
    queryKey: ["receita-detalhada", filters],
    queryFn: async () => {
      let q = supabase
        .from("vw_receita_detalhada" as any)
        .select("mes_ano, categoria, produto, comissao_bruta, banker, advisor, tipo_cliente, documento");
      q = applyCommonFilters(q, filters, "mes_ano");
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
        .select("documento, conta, banker, advisor, finder, casa, tipo_cliente, ativo_ajustado, produto_ajustado, indexador, net, vencimento");
      if (filters.documento) q = q.ilike("documento", `%${filters.documento}%`);
      if (filters.tipoCliente) q = q.eq("tipo_cliente", filters.tipoCliente);
      if (filters.casa) q = q.eq("casa", filters.casa);
      if (filters.banker.length) q = q.in("banker", filters.banker);
      if (filters.advisor.length) q = q.in("advisor", filters.advisor);
      if (filters.finder.length) q = q.in("finder", filters.finder);
      if (filters.vencimento) q = q.ilike("vencimento", `%${filters.vencimento}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    staleTime: 60_000,
  });
}

export function useBaseCrmData(filters: DashboardFilters) {
  return useQuery({
    queryKey: ["base-crm", filters],
    queryFn: async () => {
      let q = supabase
        .from("vw_base_crm" as any)
        .select("codigo_cliente, nome_cliente, assessor, banker, finder, perfil, pl_tailor, pl_declarado_ajustado, sow_ajustado, saldo_consolidado, endereco_ajustado, canal, tag");
      if (filters.documento) q = q.ilike("codigo_cliente", `%${filters.documento}%`);
      if (filters.banker.length) q = q.in("banker", filters.banker);
      if (filters.finder.length) q = q.in("finder", filters.finder);
      const { data, error } = await q.limit(1000);
      if (error) throw error;
      return data as any[];
    },
    staleTime: 60_000,
  });
}
