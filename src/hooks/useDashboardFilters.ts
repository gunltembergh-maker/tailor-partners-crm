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
};

export function useDashboardFilters() {
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);

  const updateFilter = useCallback(<K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => setFilters(defaultFilters), []);

  const currentYearMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  return { filters, updateFilter, resetFilters, currentYearMonth };
}
