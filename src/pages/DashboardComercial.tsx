import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, X, RefreshCw } from "lucide-react";
import { LastUpdateBadges } from "@/components/dashboard/LastUpdateBadges";
import { FiltersSidebar } from "@/components/dashboard/FiltersSidebar";
import { QuantitativoTab } from "@/components/dashboard/QuantitativoTab";
import { QualitativoTab } from "@/components/dashboard/QualitativoTab";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import { useDashboardRefresh } from "@/hooks/useDashboardRefresh";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

export default function DashboardComercial() {
  const {
    pendingFilters,
    appliedFilters,
    updatePendingFilter,
    applyFilters,
    resetFilters,
    hasChanges,
    activeChips,
    removeChip,
  } = useDashboardFilters();
  const [filtersOpen, setFiltersOpen] = useState(true);
  const { lastUpdatedAt, isRefreshing } = useDashboardRefresh();

  return (
    <AppLayout>
      <div className="space-y-2">
        {/* Refresh loading bar */}
        {isRefreshing && (
          <div className="fixed top-0 left-0 right-0 z-50">
            <Progress value={100} className="h-0.5 rounded-none [&>div]:animate-pulse" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-foreground">Dashboard Comercial</h1>
            <LastUpdateBadges />
            {lastUpdatedAt && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
                Dados: {format(new Date(lastUpdatedAt), "dd/MM HH:mm")}
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => setFiltersOpen((p) => !p)}
          >
            <Filter className="h-3.5 w-3.5 mr-1" />
            Filtros
          </Button>
        </div>

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Seleções:</span>
            {activeChips.map((chip, i) => (
              <Badge
                key={`${chip.key}-${chip.value}-${i}`}
                variant="secondary"
                className="text-[10px] h-5 gap-1 cursor-pointer px-2"
                onClick={() => removeChip(chip.key, chip.value)}
              >
                {chip.label}: {chip.value}
                <X className="h-2.5 w-2.5" />
              </Badge>
            ))}
          </div>
        )}

        {/* Main content */}
        <div className="flex gap-0">
          <FiltersSidebar
            pendingFilters={pendingFilters}
            updatePendingFilter={updatePendingFilter}
            applyFilters={applyFilters}
            resetFilters={resetFilters}
            hasChanges={hasChanges}
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
          />
          <div className="flex-1 min-w-0">
            <Tabs defaultValue="quantitativo" className="w-full">
              <TabsList className="mb-3 ml-3 h-8">
                <TabsTrigger value="quantitativo" className="text-[11px] h-6">Quantitativo</TabsTrigger>
                <TabsTrigger value="qualitativo" className="text-[11px] h-6">Qualitativo</TabsTrigger>
              </TabsList>
              <TabsContent value="quantitativo" className="px-3">
                <QuantitativoTab filters={appliedFilters} />
              </TabsContent>
              <TabsContent value="qualitativo" className="px-3">
                <QualitativoTab filters={appliedFilters} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
