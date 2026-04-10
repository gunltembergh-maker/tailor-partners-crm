import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DashboardFilters } from "./useDashboardFilters";
import { expandTipoCliente, expandAdvisor } from "@/components/dashboard/FiltersSidebar";
import { useScopedRpcParams, useScopedRpcParamsPbi } from "./useScopedFilters";

function anoMesRange(inicio: string, fim: string) {
  const s = inicio.replace(/-/g, "").slice(0, 6);
  const e = fim.replace(/-/g, "").slice(0, 6);
  return { s, e };
}

/** Convert DashboardFilters → RPC params (null when empty) — used only by non-hook callers */
function buildRpcParams(filters: DashboardFilters) {
  const expandedAdvisor = filters.advisor.length
    ? filters.advisor.flatMap((a) => expandAdvisor(a, []))
    : null;
  const expandedTipoCliente = filters.tipoCliente
    ? expandTipoCliente(filters.tipoCliente)
    : null;
  return {
    p_anomes: filters.anoMes.length ? filters.anoMes.map(Number) : null,
    p_banker: filters.banker.length ? filters.banker : null,
    p_documento: filters.documento ? [filters.documento] : null,
    p_advisor: expandedAdvisor,
    p_finder: filters.finder.length ? filters.finder : null,
    p_tipo_cliente: expandedTipoCliente,
  };
}

// ─── Filter options from dimension views ───

export function useFilterOptions() {
  return useQuery({
    queryKey: ["dashboard-filter-options"],
    queryFn: async () => {
      const [anoMesRes, bankerRes, advisorRes, finderRes, tipoClienteRes, casasRes] = await Promise.all([
        supabase.rpc("rpc_filtro_anomes" as any),
        supabase.rpc("rpc_filtro_financial_advisors" as any),
        supabase.rpc("rpc_filtro_advisor_slicer" as any),
        supabase.rpc("rpc_filtro_finders" as any),
        supabase.rpc("rpc_filtro_tipo_cliente" as any),
        supabase.rpc("rpc_filtro_casas" as any),
      ]);

      return {
        anoMeses: (anoMesRes.data ?? []).map((r: any) => String(r.anomes)).filter(Boolean),
        anoMesesNomes: (anoMesRes.data ?? []).reduce((acc: Record<string, string>, r: any) => {
          acc[String(r.anomes)] = r.anomes_nome;
          return acc;
        }, {} as Record<string, string>),
        bankers: (bankerRes.data ?? []).map((r: any) => r.banker as string).filter(Boolean).sort(),
        advisors: (advisorRes.data ?? []).map((r: any) => r.advisor as string).filter(Boolean).sort(),
        finders: (finderRes.data ?? []).map((r: any) => r.finder as string).filter(Boolean).sort(),
        tiposCliente: (tipoClienteRes.data ?? []).map((r: any) => r.tipo_cliente as string).filter(Boolean).sort(),
        casas: (casasRes.data ?? []).map((r: any) => r.casa as string).filter(Boolean).sort(),
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
  const params = useScopedRpcParams(filters);
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
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function useContasAggMes(filters: DashboardFilters) {
  const params = useScopedRpcParams(filters);
  return useQuery({
    queryKey: ["contas-agg-mes", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_contas_agg_mes", params as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function useContasTotalPorTipo(filters: DashboardFilters) {
  const params = useScopedRpcParams(filters);
  return useQuery({
    queryKey: ["contas-total-por-tipo", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_contas_total_por_tipo", params as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

// ─── Captação RPCs ───

export function useCaptacaoKpis(filters: DashboardFilters) {
  const params = useScopedRpcParams(filters);
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
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function useCaptacaoAggMes(filters: DashboardFilters) {
  const params = useScopedRpcParams(filters);
  return useQuery({
    queryKey: ["captacao-agg-mes", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_captacao_agg_mes", params as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function useCaptacaoTreemap(filters: DashboardFilters) {
  const params = useScopedRpcParams(filters);
  return useQuery({
    queryKey: ["captacao-treemap", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_captacao_treemap", params as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

// (buildRpcParamsPbi removed — now handled by useScopedRpcParamsPbi)

// ─── AuC RPCs (PBIX) ───

export function useAucMesStackCasa(filters: DashboardFilters) {
  const params = useScopedRpcParams(filters);
  return useQuery({
    queryKey: ["auc-mes-stack-casa", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_auc_mes_stack_casa", params as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function useAucCasaM0(filters: DashboardFilters) {
  const params = useScopedRpcParams(filters);
  return useQuery({
    queryKey: ["auc-casa-m0", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_auc_casa_m0", params as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

// ─── Faixa PL RPCs (PBIX — por mês) ───

export function useFaixaPlClientesMes(filters: DashboardFilters) {
  const params = useScopedRpcParams(filters);
  return useQuery({
    queryKey: ["faixa-pl-clientes-mes", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_faixa_pl_clientes_mes", params as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function useFaixaPlAucMes(filters: DashboardFilters) {
  const params = useScopedRpcParams(filters);
  return useQuery({
    queryKey: ["faixa-pl-auc-mes", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_faixa_pl_auc_mes", params as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

// ─── Receita RPCs (PBIX) ───

export function useReceitaTotal(filters: DashboardFilters) {
  const params = useScopedRpcParamsPbi(filters);
  return useQuery({
    queryKey: ["receita-total-pbi", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_receita_total", params as any);
      if (error) throw error;
      const row = (data as any)?.[0] ?? { receita: 0 };
      return { receita: Number(row.receita) || 0 };
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function useReceitaMesCategoria(filters: DashboardFilters) {
  const params = useScopedRpcParamsPbi(filters);
  return useQuery({
    queryKey: ["receita-mes-categoria-pbi", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_receita_mes_categoria", params as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function useReceitaTreemapCategoria(filters: DashboardFilters) {
  const params = useScopedRpcParamsPbi(filters);
  return useQuery({
    queryKey: ["receita-treemap-categoria-pbi", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_receita_treemap_categoria", params as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function useReceitaMatrizRows(filters: DashboardFilters) {
  const params = useScopedRpcParamsPbi(filters);
  return useQuery({
    queryKey: ["receita-matriz-rows-pbi", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_receita_matriz_rows", params as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function useReceitaMatrizRowsCat(filters: DashboardFilters) {
  const params = useScopedRpcParamsPbi(filters);
  return useQuery({
    queryKey: ["receita-matriz-rows-cat", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_receita_matriz_rows_cat", params as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

// ─── Receita Drilldown RPC ───

export function useReceitaDrilldown(filters: DashboardFilters, drillPath: string[]) {
  const scopedPbi = useScopedRpcParamsPbi(filters);
  const params = {
    p_anomes: scopedPbi.p_anomes,
    p_banker: scopedPbi.p_banker,
    p_finder: scopedPbi.p_finder,
    p_categoria: drillPath[0] ?? null,
    p_subcategoria: drillPath[1] ?? null,
    p_produto: drillPath[2] ?? null,
  };
  return useQuery({
    queryKey: ["receita-drilldown", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_receita_drilldown", params as any);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    enabled: drillPath.length > 0,
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
