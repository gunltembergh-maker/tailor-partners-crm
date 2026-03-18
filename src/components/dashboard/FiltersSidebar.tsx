import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Search, Check, RotateCcw } from "lucide-react";
import type { DashboardFilters } from "@/hooks/useDashboardFilters";
import { useFilterOptions } from "@/hooks/useDashboardData";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatAnoMes(v: string): string {
  if (!v || v.length < 6) return v;
  const m = parseInt(v.slice(4, 6), 10);
  const y = v.slice(0, 4);
  return `${MESES[m - 1] || "?"}/${y}`;
}

interface FiltersSidebarProps {
  pendingFilters: DashboardFilters;
  updatePendingFilter: <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => void;
  applyFilters: () => void;
  resetFilters: () => void;
  hasChanges: boolean;
  open: boolean;
  onClose: () => void;
  showVencimento?: boolean;
}

export function FiltersSidebar({
  pendingFilters,
  updatePendingFilter,
  applyFilters,
  resetFilters,
  hasChanges,
  open,
  onClose,
  showVencimento = false,
}: FiltersSidebarProps) {
  const { data: options } = useFilterOptions();

  if (!open) return null;

  const toggleMulti = (key: "banker" | "advisor" | "finder" | "anoMes", val: string) => {
    const arr = pendingFilters[key];
    updatePendingFilter(key, arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  return (
    <div
      className="w-56 shrink-0 flex flex-col text-white"
      style={{
        backgroundColor: "#1B2A3D",
        minHeight: "calc(100vh - 120px)",
      }}
    >
      {/* Logo */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
          Tailor
        </h1>
        <p className="text-[9px] tracking-[0.25em] uppercase opacity-60">Partners</p>
      </div>

      {/* Title */}
      <div className="px-4 pt-2 pb-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-80">Filtros</p>
      </div>

      {/* Filters */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-3 py-2">
          {/* Ano Mês */}
          <PbiMultiSelect
            label="Ano Mês"
            values={pendingFilters.anoMes}
            options={options?.anoMeses ?? []}
            onToggle={(v) => toggleMulti("anoMes", v)}
            formatLabel={formatAnoMes}
            placeholder="Todos os meses"
            showSelectAll
            onSelectAll={() => updatePendingFilter("anoMes", options?.anoMeses ?? [])}
            onClearAll={() => updatePendingFilter("anoMes", [])}
          />

          {/* Financial Advisor / Finder */}
          <PbiMultiSelect
            label="Financial Advisor"
            values={pendingFilters.finder}
            options={options?.finders ?? []}
            onToggle={(v) => toggleMulti("finder", v)}
          />

          {/* Documento */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase tracking-wider font-semibold opacity-70">Documento</label>
            <Input
              placeholder="CPF/CNPJ..."
              value={pendingFilters.documento}
              onChange={(e) => updatePendingFilter("documento", e.target.value)}
              className="text-[10px] h-7 bg-white/10 border-white/20 text-white placeholder:text-white/40"
            />
          </div>

          {/* Advisor */}
          <PbiMultiSelect
            label="Advisor"
            values={pendingFilters.advisor}
            options={options?.advisors ?? []}
            onToggle={(v) => toggleMulti("advisor", v)}
          />

          {/* Banker */}
          <PbiMultiSelect
            label="Banker"
            values={pendingFilters.banker}
            options={options?.bankers ?? []}
            onToggle={(v) => toggleMulti("banker", v)}
          />

          {/* Tipo Cliente */}
          <PbiMultiSelect
            label="Tipo de Cliente"
            values={pendingFilters.tipoCliente ? [pendingFilters.tipoCliente] : []}
            options={options?.tiposCliente ?? []}
            onToggle={(v) => {
              updatePendingFilter("tipoCliente", pendingFilters.tipoCliente === v ? "" : v);
            }}
            singleSelect
          />

          {/* Vencimento (only qualitativo) */}
          {showVencimento && (
            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-wider font-semibold opacity-70">Vencimento</label>
              <Input
                placeholder="Ex: 2025"
                value={pendingFilters.vencimento}
                onChange={(e) => updatePendingFilter("vencimento", e.target.value)}
                className="text-[10px] h-7 bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer buttons */}
      <div className="px-3 py-3 flex gap-2 border-t border-white/10">
        <Button
          size="sm"
          className="flex-1 h-7 text-[10px] bg-white/20 hover:bg-white/30 text-white border-0"
          onClick={applyFilters}
          disabled={!hasChanges}
        >
          <Check className="h-3 w-3 mr-1" />
          Aplicar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[10px] text-white/70 hover:text-white hover:bg-white/10"
          onClick={resetFilters}
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Limpar
        </Button>
      </div>
    </div>
  );
}

function PbiMultiSelect({
  label,
  values,
  options,
  onToggle,
  singleSelect = false,
  formatLabel,
  placeholder,
  showSelectAll = false,
  onSelectAll,
  onClearAll,
}: {
  label: string;
  values: string[];
  options: string[];
  onToggle: (v: string) => void;
  singleSelect?: boolean;
  formatLabel?: (v: string) => string;
  placeholder?: string;
  showSelectAll?: boolean;
  onSelectAll?: () => void;
  onClearAll?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );
  const display = formatLabel || ((v: string) => v);
  const allSelected = options.length > 0 && values.length === options.length;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[9px] uppercase tracking-wider font-semibold opacity-70">{label}</label>
        {showSelectAll && !singleSelect && (
          <button
            className="text-[8px] opacity-50 hover:opacity-80"
            onClick={() => allSelected ? onClearAll?.() : onSelectAll?.()}
          >
            {allSelected ? "Limpar" : "Selecionar tudo"}
          </button>
        )}
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map((v) => (
            <Badge
              key={v}
              className="text-[8px] h-4 cursor-pointer gap-0.5 px-1.5 bg-white/20 text-white hover:bg-white/30 border-0"
              onClick={() => onToggle(v)}
            >
              {display(v)}
              <X className="h-2 w-2" />
            </Badge>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-2 top-1.5 h-3 w-3 text-white/40" />
        <Input
          placeholder={`Buscar...`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setExpanded(true);
          }}
          onFocus={() => setExpanded(true)}
          className="text-[10px] h-7 pl-6 bg-white/10 border-white/20 text-white placeholder:text-white/40"
        />
      </div>
      {expanded && filtered.length > 0 && (
        <div className="rounded bg-white/10 max-h-28 overflow-y-auto">
          {filtered.slice(0, 20).map((o) => (
            <label
              key={o}
              className="flex items-center gap-2 px-2 py-0.5 hover:bg-white/10 cursor-pointer text-[10px]"
            >
              <Checkbox
                checked={values.includes(o)}
                onCheckedChange={() => onToggle(o)}
                className="h-3 w-3 border-white/40 data-[state=checked]:bg-white/30"
              />
              <span className="truncate">{display(o)}</span>
            </label>
          ))}
          {filtered.length > 20 && (
            <p className="text-[9px] opacity-50 px-2 py-0.5">+{filtered.length - 20} mais...</p>
          )}
        </div>
      )}
      {expanded && (
        <button
          className="text-[9px] opacity-50 hover:opacity-80 w-full text-center py-0.5"
          onClick={() => setExpanded(false)}
        >
          Fechar
        </button>
      )}
    </div>
  );
}
