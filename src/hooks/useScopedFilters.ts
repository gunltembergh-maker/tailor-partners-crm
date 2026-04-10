/**
 * Hook that merges ViewAs overrides into DashboardFilters,
 * producing final RPC params that respect the simulated view.
 */
import type { DashboardFilters } from "./useDashboardFilters";
import { useViewAsFilters } from "@/contexts/ViewAsContext";
import { expandTipoCliente, expandAdvisor } from "@/components/dashboard/FiltersSidebar";

export function useScopedRpcParams(filters: DashboardFilters) {
  const { overrideBanker, overrideFinder, overrideAdvisor } = useViewAsFilters();

  const expandedAdvisor = filters.advisor.length
    ? filters.advisor.flatMap((a) => expandAdvisor(a, []))
    : null;

  const expandedTipoCliente = filters.tipoCliente
    ? expandTipoCliente(filters.tipoCliente)
    : null;

  return {
    p_anomes: filters.anoMes.length ? filters.anoMes.map(Number) : null,
    p_banker: overrideBanker ?? (filters.banker.length ? filters.banker : null),
    p_documento: filters.documento ? [filters.documento] : null,
    p_advisor: overrideAdvisor ?? expandedAdvisor,
    p_finder: overrideFinder ?? (filters.finder.length ? filters.finder : null),
    p_tipo_cliente: expandedTipoCliente,
    p_casa: filters.casa.length ? filters.casa : null,
  };
}

export function useScopedRpcParamsPbi(filters: DashboardFilters) {
  const { overrideBanker, overrideFinder } = useViewAsFilters();

  return {
    p_anomes: filters.anoMes.length ? filters.anoMes.map(Number) : null,
    p_banker: overrideBanker ?? (filters.banker.length ? filters.banker : null),
    p_finder: overrideFinder ?? (filters.finder.length ? filters.finder : null),
    p_casa: filters.casa.length ? filters.casa : null,
  };
}

export function useScopedFullParams(filters: DashboardFilters) {
  const { overrideBanker, overrideFinder, overrideAdvisor } = useViewAsFilters();

  return {
    p_anomes: null as any,
    p_banker: overrideBanker ?? (filters.banker.length ? filters.banker : null),
    p_advisor: overrideAdvisor ?? (filters.advisor.length ? filters.advisor : null),
    p_finder: overrideFinder ?? (filters.finder.length ? filters.finder : null),
    p_documento: filters.documento ? [filters.documento] : null,
    p_tipo_cliente: filters.tipoCliente ? [filters.tipoCliente] : null,
    p_casa: filters.casa.length ? filters.casa : null,
  };
}
