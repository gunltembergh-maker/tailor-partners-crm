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
  const { role, bankerName, loading: authLoading } = useAuth();

  const isLockedBanker = role === "BANKER" && !!bankerName;
  const isLockedFinder = role === "FINDER" && !!bankerName;
  const isLockedAssessor = role === "ASSESSOR" && !!bankerName;

  // Profile is "ready" when auth finished loading AND any role-lock has resolved
  const profileReady = !authLoading && (
    // Roles that need a name must have it loaded
    (role === "BANKER" || role === "FINDER" || role === "ASSESSOR")
      ? !!bankerName
      : true // ADMIN, LIDER, or no role — ready immediately
  );

  // Compute role-locked initial filters
  const roleLockedFilters = useMemo(() => {
    const filters = { ...defaultFilters };
    if (bankerName) {
      if (role === "BANKER") {
        filters.banker = [bankerName];
      } else if (role === "FINDER") {
        filters.finder = [bankerName];
      } else if (role === "ASSESSOR") {
        filters.advisor = [bankerName];
      }
    }
    return filters;
  }, [role, bankerName]);

  const [pendingFilters, setPendingFilters] = useState<DashboardFilters>(roleLockedFilters);
  const [rawAppliedFilters, setAppliedFilters] = useState<DashboardFilters>(roleLockedFilters);

  // Sync when role/bankerName load (they start null)
  useEffect(() => {
    if (bankerName && (role === "BANKER" || role === "FINDER" || role === "ASSESSOR")) {
      const patch = role === "BANKER" ? { banker: [bankerName] }
        : role === "FINDER" ? { finder: [bankerName] }
        : { advisor: [bankerName] };
      setPendingFilters(prev => ({ ...prev, ...patch }));
      setAppliedFilters(prev => ({ ...prev, ...patch }));
    }
  }, [role, bankerName]);



  // CRITICAL: Always enforce role-based filter on appliedFilters
  // This guarantees the lock even if useEffect hasn't fired yet
  const appliedFilters = useMemo<DashboardFilters>(() => {
    const f = { ...rawAppliedFilters };
    if (isLockedBanker && bankerName) {
      f.banker = [bankerName];
    }
    if (isLockedFinder && bankerName) {
      f.finder = [bankerName];
    }
    if (isLockedAssessor && bankerName) {
      f.advisor = [bankerName];
    }
    return f;
  }, [rawAppliedFilters, isLockedBanker, isLockedFinder, isLockedAssessor, bankerName]);

  const updatePendingFilter = useCallback(<K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => {
    if (key === "banker" && isLockedBanker) return;
    if (key === "finder" && isLockedFinder) return;
    if (key === "advisor" && isLockedAssessor) return;
    setPendingFilters((prev) => ({ ...prev, [key]: value }));
  }, [isLockedBanker, isLockedFinder, isLockedAssessor]);

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
    if (key === "banker" && isLockedBanker) return;
    if (key === "finder" && isLockedFinder) return;
    if (key === "advisor" && isLockedAssessor) return;
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
    isLockedAssessor,
    profileReady,
  };
}
