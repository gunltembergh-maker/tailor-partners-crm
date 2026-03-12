import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Filter, RotateCcw } from "lucide-react";
import type { DashboardFilters } from "@/hooks/useDashboardFilters";
import { useFilterOptions } from "@/hooks/useDashboardData";

interface FiltersSidebarProps {
  filters: DashboardFilters;
  updateFilter: <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => void;
  resetFilters: () => void;
  open: boolean;
  onClose: () => void;
}

export function FiltersSidebar({ filters, updateFilter, resetFilters, open, onClose }: FiltersSidebarProps) {
  const { data: options } = useFilterOptions();

  if (!open) return null;

  const toggleMulti = (key: "banker" | "advisor" | "finder", val: string) => {
    const arr = filters[key];
    updateFilter(key, arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  return (
    <div className="w-72 shrink-0 border-r border-border bg-card p-4 space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Filtros</span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetFilters}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Período */}
      <div className="space-y-1.5">
        <Label className="text-xs">Período</Label>
        <div className="flex gap-2">
          <Input type="date" value={filters.periodoInicio} onChange={(e) => updateFilter("periodoInicio", e.target.value)} className="text-xs h-8" />
          <Input type="date" value={filters.periodoFim} onChange={(e) => updateFilter("periodoFim", e.target.value)} className="text-xs h-8" />
        </div>
      </div>

      {/* Documento */}
      <div className="space-y-1.5">
        <Label className="text-xs">Documento</Label>
        <Input placeholder="CPF/CNPJ..." value={filters.documento} onChange={(e) => updateFilter("documento", e.target.value)} className="text-xs h-8" />
      </div>

      {/* Banker */}
      <MultiSelect label="Banker" values={filters.banker} options={options?.bankers ?? []} onToggle={(v) => toggleMulti("banker", v)} />

      {/* Advisor */}
      <MultiSelect label="Advisor" values={filters.advisor} options={options?.advisors ?? []} onToggle={(v) => toggleMulti("advisor", v)} />

      {/* Finder */}
      <MultiSelect label="Finder" values={filters.finder} options={options?.finders ?? []} onToggle={(v) => toggleMulti("finder", v)} />

      {/* Tipo Cliente */}
      <div className="space-y-1.5">
        <Label className="text-xs">Tipo Cliente</Label>
        <Select value={filters.tipoCliente || "all"} onValueChange={(v) => updateFilter("tipoCliente", v === "all" ? "" : v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {(options?.tiposCliente ?? []).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Casa */}
      <div className="space-y-1.5">
        <Label className="text-xs">Casa</Label>
        <Select value={filters.casa || "all"} onValueChange={(v) => updateFilter("casa", v === "all" ? "" : v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {(options?.casas ?? []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function MultiSelect({ label, values, options, onToggle }: { label: string; values: string[]; options: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {values.map((v) => (
            <Badge key={v} variant="secondary" className="text-[10px] cursor-pointer gap-1" onClick={() => onToggle(v)}>
              {v} <X className="h-2.5 w-2.5" />
            </Badge>
          ))}
        </div>
      )}
      <Select onValueChange={onToggle} value="">
        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={`Selecionar ${label.toLowerCase()}...`} /></SelectTrigger>
        <SelectContent>
          {options.filter((o) => !values.includes(o)).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
