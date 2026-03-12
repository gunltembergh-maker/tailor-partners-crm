import { useState, useCallback, useMemo } from "react";

export interface DashboardFilters {
  periodoInicio: string;
  periodoFim: string;
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
  banker: [],
  advisor: [],
  finder: [],
  documento: "",
  tipoCliente: "",
  casa: "",
  vencimento: "",
};

export function useDashboardFilters() {
  const [pendingFilters, setPendingFilters] = useState<DashboardFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<DashboardFilters>(defaultFilters);

  const updatePendingFilter = useCallback(<K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => {
    setPendingFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...pendingFilters });
  }, [pendingFilters]);

  const resetFilters = useCallback(() => {
    setPendingFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  }, []);

  const hasChanges = useMemo(() => {
    return JSON.stringify(pendingFilters) !== JSON.stringify(appliedFilters);
  }, [pendingFilters, appliedFilters]);

  const activeChips = useMemo(() => {
    const chips: { key: keyof DashboardFilters; label: string; value: string }[] = [];
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
    setAppliedFilters(prev => {
      const next = { ...prev };
      if (key === "banker" || key === "advisor" || key === "finder") {
        next[key] = prev[key].filter(v => v !== value);
      } else {
        (next as any)[key] = "";
      }
      return next;
    });
    setPendingFilters(prev => {
      const next = { ...prev };
      if (key === "banker" || key === "advisor" || key === "finder") {
        next[key] = prev[key].filter(v => v !== value);
      } else {
        (next as any)[key] = "";
      }
      return next;
    });
  }, []);

  return {
    pendingFilters,
    appliedFilters,
    updatePendingFilter,
    applyFilters,
    resetFilters,
    hasChanges,
    activeChips,
    removeChip,
  };
}
