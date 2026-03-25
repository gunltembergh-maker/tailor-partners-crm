import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { DashboardFilters } from "./useDashboardFilters";

/**
 * Returns effective RPC params and a `ready` flag that gates all dashboard queries.
 *
 * For BANKER/FINDER/ASSESSOR roles, the corresponding filter is forced to the user's name
 * regardless of what the UI filters contain.
 *
 * For ADMIN/LIDER, the UI filters are used as-is (null = no filter = see everything).
 */
export function useScopedDashboardParams(filters: DashboardFilters) {
  const { role, bankerName, loading: authLoading } = useAuth();

  const isLockedBanker = role === "BANKER" && !!bankerName;
  const isLockedFinder = role === "FINDER" && !!bankerName;
  const isLockedAssessor = role === "ASSESSOR" && !!bankerName;

  // Profile is ready when auth is done AND any role that needs a name has it
  const ready = !authLoading && (
    (role === "BANKER" || role === "FINDER" || role === "ASSESSOR")
      ? !!bankerName
      : true
  );

  const effectiveParams = useMemo(() => {
    // Force the correct filter per role
    const p_banker = isLockedBanker
      ? [bankerName!]
      : filters.banker.length ? filters.banker : null;

    const p_advisor = isLockedAssessor
      ? [bankerName!] // rpc_meu_perfil stores the name in banker_name for all roles
      : filters.advisor.length ? filters.advisor : null;

    const p_finder = isLockedFinder
      ? [bankerName!]
      : filters.finder.length ? filters.finder : null;

    return {
      p_anomes: filters.anoMes.length ? filters.anoMes.map(Number) : null,
      p_banker,
      p_documento: filters.documento ? [filters.documento] : null,
      p_advisor,
      p_finder,
      p_tipo_cliente: filters.tipoCliente ? [filters.tipoCliente] : null,
    };
  }, [filters, isLockedBanker, isLockedFinder, isLockedAssessor, bankerName]);

  // Subset for RPCs that only accept banker + documento (receita, ROA)
  const effectiveParamsPbi = useMemo(() => ({
    p_anomes: effectiveParams.p_anomes,
    p_banker: effectiveParams.p_banker,
  }), [effectiveParams.p_anomes, effectiveParams.p_banker]);

  const effectiveParamsRoa = useMemo(() => ({
    p_banker: effectiveParams.p_banker,
    p_documento: effectiveParams.p_documento,
    p_tipo_cliente: effectiveParams.p_tipo_cliente,
  }), [effectiveParams.p_banker, effectiveParams.p_documento, effectiveParams.p_tipo_cliente]);

  return { effectiveParams, effectiveParamsPbi, effectiveParamsRoa, ready };
}
