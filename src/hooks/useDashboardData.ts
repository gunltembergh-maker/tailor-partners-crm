import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DashboardFilters } from "./useDashboardFilters";

function anoMesRange(inicio: string, fim: string) {
  const s = inicio.replace(/-/g, "").slice(0, 6);
  const e = fim.replace(/-/g, "").slice(0, 6);
  return { s, e };
}

/** Convert DashboardFilters → RPC params (null when empty) */
function buildRpcParams(filters: DashboardFilters) {
  return {
    p_anomes: filters.anoMes.length ? filters.anoMes.map(Number) : null,
    p_banker: filters.banker.length ? filters.banker : null,
    p_documento: filters.documento ? [filters.documento] : null,
    p_advisor: filters.advisor.length ? filters.advisor : null,
    p_finder: filters.finder.length ? filters.finder : null,
    p_tipo_cliente: filters.tipoCliente ? [filters.tipoCliente] : null,
  };
}

// ─── Filter options from dimension views ───

export function useFilterOptions() {
  return useQuery({
    queryKey: ["dashboard-filter-options"],
    queryFn: async () => {
      const [anoMesRes, bankerRes, advisorRes, finderRes, tipoClienteRes] = await Promise.all([
        supabase.from("vw_dim_anomes").select("anomes").order("anomes", { ascending: false }),
        supabase.from("vw_dim_banker").select("banker"),
        supabase.from("vw_dim_advisor").select("advisor"),
        supabase.from("vw_dim_finder").select("finder"),
        supabase.from("vw_dim_tipo_cliente").select("tipo_cliente"),
      ]);

      return {
        anoMeses: (anoMesRes.data ?? []).map((r: any) => String(r.anomes)).filter(Boolean),
        bankers: (bankerRes.data ?? []).map((r: any) => r.banker as string).filter(Boolean).sort(),
        advisors: (advisorRes.data ?? []).map((r: any) => r.advisor as string).filter(Boolean).sort(),
        finders: (finderRes.data ?? []).map((r: any) => r.finder as string).filter(Boolean).sort(),
        tiposCliente: (tipoClienteRes.data ?? []).map((r: any) => r.tipo_cliente as string).filter(Boolean).sort(),
        casas: [] as string[], // kept for compat
      };
    },
    staleTime: 5 * 60_000,
  });
}

// ─── Sync logs ───

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

// ─── Contas RPCs ───

export function useContasKpis(filters: DashboardFilters) {
  const params = buildRpcParams(filters);
  return useQuery({
    queryKey: ["contas-kpis", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_contas_kpis", params as any);
      if (error) throw error;
      const row = (data as any)?.[0] ?? { migracao: 0, habilitacao: 0, ativacao: 0 };
      return {
        migracao: Number(row.migracao) || 0,
        habilitacao: Number(row.habilitacao) || 0,
        ativacao: Number(row.ativacao) || 0,
      };
    },
    staleTime: 60_000,
  });
}

export function useContasAggMes(filters: DashboardFilters) {
  const params = buildRpcParams(filters);
  return useQuery({
    queryKey: ["contas-agg-mes", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_contas_agg_mes", params as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}

export function useContasTotalPorTipo(filters: DashboardFilters) {
  const params = buildRpcParams(filters);
  return useQuery({
    queryKey: ["contas-total-por-tipo", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_contas_total_por_tipo", params as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}

// ─── Captação RPCs ───

export function useCaptacaoKpis(filters: DashboardFilters) {
  const params = buildRpcParams(filters);
  return useQuery({
    queryKey: ["captacao-kpis", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_captacao_kpis", params as any);
      if (error) throw error;
      const row = (data as any)?.[0] ?? { ref_date: null, captacao_mtd: 0, captacao_ytd: 0 };
      return {
        ref_date: row.ref_date,
        captacao_mtd: Number(row.captacao_mtd) || 0,
        captacao_ytd: Number(row.captacao_ytd) || 0,
      };
    },
    staleTime: 60_000,
  });
}

export function useCaptacaoAggMes(filters: DashboardFilters) {
  const params = buildRpcParams(filters);
  return useQuery({
    queryKey: ["captacao-agg-mes", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_captacao_agg_mes", params as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}

export function useCaptacaoTreemap(filters: DashboardFilters) {
  const params = buildRpcParams(filters);
  return useQuery({
    queryKey: ["captacao-treemap", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_captacao_treemap", params as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}

// ─── AuC RPCs ───

export function useAucMes(filters: DashboardFilters) {
  const params = buildRpcParams(filters);
  return useQuery({
    queryKey: ["auc-mes", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_auc_mes", params as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}

export function useAucCasa(filters: DashboardFilters) {
  const params = buildRpcParams(filters);
  return useQuery({
    queryKey: ["auc-casa", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_auc_casa", params as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}

// ─── Faixa PL RPCs ───

export function useFaixaPlClientes(filters: DashboardFilters) {
  const params = buildRpcParams(filters);
  return useQuery({
    queryKey: ["faixa-pl-clientes", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_faixa_pl_clientes", params as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}

export function useFaixaPlAuc(filters: DashboardFilters) {
  const params = buildRpcParams(filters);
  return useQuery({
    queryKey: ["faixa-pl-auc", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_faixa_pl_auc", params as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}

// ─── Receita RPCs ───

export function useReceitaKpi(filters: DashboardFilters) {
  const params = buildRpcParams(filters);
  return useQuery({
    queryKey: ["receita-kpi", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_receita_kpi", params as any);
      if (error) throw error;
      const row = (data as any)?.[0] ?? { receita_total: 0 };
      return { receita_total: Number(row.receita_total) || 0 };
    },
    staleTime: 60_000,
  });
}

export function useReceitaMesCategoria(filters: DashboardFilters) {
  const params = buildRpcParams(filters);
  return useQuery({
    queryKey: ["receita-mes-categoria", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_receita_mes_categoria", params as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}

export function useReceitaTreemapCategoria(filters: DashboardFilters) {
  const params = buildRpcParams(filters);
  return useQuery({
    queryKey: ["receita-treemap-categoria", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_receita_treemap_categoria", params as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}

export function useReceitaMatriz(filters: DashboardFilters) {
  const params = buildRpcParams(filters);
  return useQuery({
    queryKey: ["receita-matriz", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_receita_matriz", params as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });
}

// ─── Existing view-based hooks (kept for other sections) ───

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
