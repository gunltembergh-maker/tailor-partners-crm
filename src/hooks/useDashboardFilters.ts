import { useState, useCallback, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export interface DashboardFilters {
  periodoInicio: string;
  periodoFim: string;
  anoMes: string[];
  banker: string[];
  advisor: string[];
  finder: string[];
  documento: string;
  tipoCliente: string;
  casa: string;
  vencimento: string;
}

const now = new Date();
const startOfYear = `${now.getFullYear()}-01-01`;
const today = now.toISOString().slice(0, 10);

const defaultFilters: DashboardFilters = {
  periodoInicio: startOfYear,
  periodoFim: today,
  anoMes: [],
  banker: [],
  advisor: [],
  finder: [],
  documento: "",
  tipoCliente: "",
  casa: "",
  vencimento: "",
};

export function useDashboardFilters() {
  const { role, bankerName } = useAuth();

  // Compute role-locked initial filters
  const roleLockedFilters = useMemo(() => {
    const filters = { ...defaultFilters };
    if (bankerName) {
      if (role === "BANKER") {
        filters.banker = [bankerName];
      } else if (role === "FINDER") {
        filters.finder = [bankerName];
      }
    }
    return filters;
  }, [role, bankerName]);

  const [pendingFilters, setPendingFilters] = useState<DashboardFilters>(roleLockedFilters);
  const [appliedFilters, setAppliedFilters] = useState<DashboardFilters>(roleLockedFilters);

  // Sync when role/bankerName load (they start null)
  useEffect(() => {
    if (bankerName && (role === "BANKER" || role === "FINDER")) {
      setPendingFilters(prev => ({
        ...prev,
        ...(role === "BANKER" ? { banker: [bankerName] } : { finder: [bankerName] }),
      }));
      setAppliedFilters(prev => ({
        ...prev,
        ...(role === "BANKER" ? { banker: [bankerName] } : { finder: [bankerName] }),
      }));
    }
  }, [role, bankerName]);

  const isLockedBanker = role === "BANKER" && !!bankerName;
  const isLockedFinder = role === "FINDER" && !!bankerName;

  const updatePendingFilter = useCallback(<K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => {
    // Prevent BANKER from changing banker filter, FINDER from changing finder filter
    if (key === "banker" && isLockedBanker) return;
    if (key === "finder" && isLockedFinder) return;
    setPendingFilters((prev) => ({ ...prev, [key]: value }));
  }, [isLockedBanker, isLockedFinder]);

  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...pendingFilters });
  }, [pendingFilters]);

  const resetFilters = useCallback(() => {
    setPendingFilters(roleLockedFilters);
    setAppliedFilters(roleLockedFilters);
  }, [roleLockedFilters]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(pendingFilters) !== JSON.stringify(appliedFilters);
  }, [pendingFilters, appliedFilters]);

  const activeChips = useMemo(() => {
    const chips: { key: keyof DashboardFilters; label: string; value: string }[] = [];
    if (appliedFilters.anoMes.length > 0) {
      appliedFilters.anoMes.forEach(v => chips.push({ key: "anoMes", label: "Ano Mês", value: v }));
    }
    if (appliedFilters.banker.length) {
      appliedFilters.banker.forEach(v => chips.push({ key: "banker", label: "Banker", value: v }));
    }
    if (appliedFilters.advisor.length) {
      appliedFilters.advisor.forEach(v => chips.push({ key: "advisor", label: "Advisor", value: v }));
    }
    if (appliedFilters.finder.length) {
      appliedFilters.finder.forEach(v => chips.push({ key: "finder", label: "Finder", value: v }));
    }
    if (appliedFilters.documento) {
      chips.push({ key: "documento", label: "Documento", value: appliedFilters.documento });
    }
    if (appliedFilters.tipoCliente) {
      chips.push({ key: "tipoCliente", label: "Tipo Cliente", value: appliedFilters.tipoCliente });
    }
    if (appliedFilters.casa) {
      chips.push({ key: "casa", label: "Casa", value: appliedFilters.casa });
    }
    if (appliedFilters.vencimento) {
      chips.push({ key: "vencimento", label: "Vencimento", value: appliedFilters.vencimento });
    }
    return chips;
  }, [appliedFilters]);

  const removeChip = useCallback((key: keyof DashboardFilters, value: string) => {
    // Prevent removing locked filters
    if (key === "banker" && isLockedBanker) return;
    if (key === "finder" && isLockedFinder) return;
    setAppliedFilters(prev => {
      const next = { ...prev };
      if (key === "banker" || key === "advisor" || key === "finder" || key === "anoMes") {
        next[key] = prev[key].filter(v => v !== value);
      } else {
        (next as any)[key] = "";
      }
      return next;
    });
    setPendingFilters(prev => {
      const next = { ...prev };
      if (key === "banker" || key === "advisor" || key === "finder" || key === "anoMes") {
        next[key] = prev[key].filter(v => v !== value);
      } else {
        (next as any)[key] = "";
      }
      return next;
    });
  }, [isLockedBanker, isLockedFinder]);

  return {
    pendingFilters,
    appliedFilters,
    updatePendingFilter,
    applyFilters,
    resetFilters,
    hasChanges,
    activeChips,
    removeChip,
    isLockedBanker,
    isLockedFinder,
  };
}
