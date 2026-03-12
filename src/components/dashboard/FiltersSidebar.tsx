import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Filter, Check, RotateCcw, Search } from "lucide-react";
import type { DashboardFilters } from "@/hooks/useDashboardFilters";
import { useFilterOptions } from "@/hooks/useDashboardData";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

interface FiltersSidebarProps {
  pendingFilters: DashboardFilters;
  updatePendingFilter: <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => void;
  applyFilters: () => void;
  resetFilters: () => void;
  hasChanges: boolean;
  open: boolean;
  onClose: () => void;
}

export function FiltersSidebar({
  pendingFilters,
  updatePendingFilter,
  applyFilters,
  resetFilters,
  hasChanges,
  open,
  onClose,
}: FiltersSidebarProps) {
  const { data: options } = useFilterOptions();

  if (!open) return null;

  const toggleMulti = (key: "banker" | "advisor" | "finder", val: string) => {
    const arr = pendingFilters[key];
    updatePendingFilter(key, arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  return (
    <div className="w-64 shrink-0 border-r flex flex-col bg-muted/40" style={{ minHeight: "calc(100vh - 160px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b">
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Filtros</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Filters content */}
      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-4">
          {/* Período */}
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Período</Label>
            <div className="flex gap-1.5">
              <Input
                type="date"
                value={pendingFilters.periodoInicio}
                onChange={(e) => updatePendingFilter("periodoInicio", e.target.value)}
                className="text-[11px] h-7 px-1.5"
              />
              <Input
                type="date"
                value={pendingFilters.periodoFim}
                onChange={(e) => updatePendingFilter("periodoFim", e.target.value)}
                className="text-[11px] h-7 px-1.5"
              />
            </div>
          </div>

          {/* Documento */}
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Documento</Label>
            <Input
              placeholder="CPF/CNPJ..."
              value={pendingFilters.documento}
              onChange={(e) => updatePendingFilter("documento", e.target.value)}
              className="text-[11px] h-7"
            />
          </div>

          {/* Banker */}
          <SearchableMultiSelect
            label="Banker"
            values={pendingFilters.banker}
            options={options?.bankers ?? []}
            onToggle={(v) => toggleMulti("banker", v)}
          />

          {/* Advisor */}
          <SearchableMultiSelect
            label="Advisor"
            values={pendingFilters.advisor}
            options={options?.advisors ?? []}
            onToggle={(v) => toggleMulti("advisor", v)}
          />

          {/* Finder */}
          <SearchableMultiSelect
            label="Finder"
            values={pendingFilters.finder}
            options={options?.finders ?? []}
            onToggle={(v) => toggleMulti("finder", v)}
          />

          {/* Tipo Cliente */}
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tipo Cliente</Label>
            <Select
              value={pendingFilters.tipoCliente || "all"}
              onValueChange={(v) => updatePendingFilter("tipoCliente", v === "all" ? "" : v)}
            >
              <SelectTrigger className="h-7 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {(options?.tiposCliente ?? []).map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Casa */}
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Casa</Label>
            <Select
              value={pendingFilters.casa || "all"}
              onValueChange={(v) => updatePendingFilter("casa", v === "all" ? "" : v)}
            >
              <SelectTrigger className="h-7 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {(options?.casas ?? []).map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </ScrollArea>

      {/* Footer buttons */}
      <div className="border-t px-3 py-2.5 flex gap-2">
        <Button
          size="sm"
          className="flex-1 h-7 text-[11px]"
          onClick={applyFilters}
          disabled={!hasChanges}
        >
          <Check className="h-3 w-3 mr-1" />
          Aplicar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[11px]"
          onClick={resetFilters}
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Limpar
        </Button>
      </div>
    </div>
  );
}

function SearchableMultiSelect({
  label,
  values,
  options,
  onToggle,
}: {
  label: string;
  values: string[];
  options: string[];
  onToggle: (v: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</Label>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map((v) => (
            <Badge
              key={v}
              variant="secondary"
              className="text-[9px] h-5 cursor-pointer gap-0.5 px-1.5"
              onClick={() => onToggle(v)}
            >
              {v}
              <X className="h-2.5 w-2.5" />
            </Badge>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground" />
        <Input
          placeholder={`Buscar ${label.toLowerCase()}...`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setExpanded(true);
          }}
          onFocus={() => setExpanded(true)}
          className="text-[11px] h-7 pl-6"
        />
      </div>
      {expanded && filtered.length > 0 && (
        <div className="border rounded-md bg-card max-h-32 overflow-y-auto">
          {filtered.slice(0, 20).map((o) => (
            <label
              key={o}
              className="flex items-center gap-2 px-2 py-1 hover:bg-muted/50 cursor-pointer text-[11px]"
            >
              <Checkbox
                checked={values.includes(o)}
                onCheckedChange={() => onToggle(o)}
                className="h-3 w-3"
              />
              <span className="truncate">{o}</span>
            </label>
          ))}
          {filtered.length > 20 && (
            <p className="text-[10px] text-muted-foreground px-2 py-1">
              +{filtered.length - 20} mais...
            </p>
          )}
        </div>
      )}
      {expanded && (
        <Button
          variant="ghost"
          size="sm"
          className="h-5 text-[10px] w-full"
          onClick={() => setExpanded(false)}
        >
          Fechar
        </Button>
      )}
    </div>
  );
}
