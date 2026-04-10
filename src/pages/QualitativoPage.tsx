import { useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, RefreshCw, Clock } from "lucide-react";
import { FiltersSidebar } from "@/components/dashboard/FiltersSidebar";
import { QualitativoTab } from "@/components/dashboard/QualitativoTab";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import { useDashboardRefresh } from "@/hooks/useDashboardRefresh";
import { Progress } from "@/components/ui/progress";
import { useActivityLog } from "@/hooks/useActivityLog";

export default function QualitativoPage() {
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
  const { logActivity } = useActivityLog();

  useEffect(() => {
    logActivity("Acesso ao Qualitativo", undefined, "/qualitativo");
  }, []);

  const {
    isRefreshing,
    isManualRefreshing,
    manualRefresh,
    atualizadoEmFormatted,
    dadosAteFormatted,
  } = useDashboardRefresh();

  return (
    <AppLayout>
      <div style={{ backgroundColor: "#F2F2F2", minHeight: "calc(100vh - 64px)", margin: "-1.5rem", padding: "0" }}>
        {isRefreshing && (
          <div className="fixed top-0 left-0 right-0 z-50">
            <Progress value={100} className="h-0.5 rounded-none [&>div]:animate-pulse" />
          </div>
        )}

        <div className="flex">
          <FiltersSidebar
            pendingFilters={pendingFilters}
            updatePendingFilter={updatePendingFilter}
            applyFilters={applyFilters}
            resetFilters={resetFilters}
            hasChanges={hasChanges}
            open={true}
            onClose={() => {}}
            showVencimento={true}
          />

          <div className="flex-1 min-w-0 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <h1 className="text-base font-semibold" style={{ color: "#1B2A3D" }}>Dashboard Qualitativo</h1>
                <span className="text-[10px] flex items-center gap-1" style={{ color: "#9CA3AF" }}>
                  <Clock className="h-3 w-3" />
                  Atualizado {atualizadoEmFormatted}
                </span>
                <span className="text-[10px] flex items-center gap-1" style={{ color: "#9CA3AF" }}>
                  <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
                  Dados: {dadosAteFormatted}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] gap-1"
                  onClick={manualRefresh}
                  disabled={isManualRefreshing}
                >
                  <RefreshCw className={`h-3 w-3 ${isManualRefreshing ? "animate-spin" : ""}`} />
                  Atualizar Dados
                </Button>
              </div>
            </div>

            {activeChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "#6B7280" }}>Seleções:</span>
                {activeChips.map((chip, i) => (
                  <Badge
                    key={`${chip.key}-${chip.value}-${i}`}
                    className="text-[10px] h-5 gap-1 cursor-pointer px-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                    onClick={() => removeChip(chip.key, chip.value)}
                  >
                    {chip.label}: {chip.value}
                    <X className="h-2.5 w-2.5" />
                  </Badge>
                ))}
              </div>
            )}

            <QualitativoTab filters={appliedFilters} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
