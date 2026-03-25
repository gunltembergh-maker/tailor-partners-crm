import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { X, RefreshCw } from "lucide-react";
import { LastUpdateBadges } from "@/components/dashboard/LastUpdateBadges";
import { FiltersSidebar } from "@/components/dashboard/FiltersSidebar";
import { QualitativoTab } from "@/components/dashboard/QualitativoTab";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import { useDashboardRefresh } from "@/hooks/useDashboardRefresh";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

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
    isLockedBanker,
    isLockedFinder,
  } = useDashboardFilters();
  const { lastUpdatedAt, isRefreshing } = useDashboardRefresh();

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
            isLockedBanker={isLockedBanker}
            isLockedFinder={isLockedFinder}
            isLockedAssessor={isLockedAssessor}
          />

          <div className="flex-1 min-w-0 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <h1 className="text-base font-semibold" style={{ color: "#1B2A3D" }}>Dashboard Qualitativo</h1>
                <LastUpdateBadges />
                {lastUpdatedAt && (
                  <span className="text-[10px] flex items-center gap-1" style={{ color: "#9CA3AF" }}>
                    <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
                    Dados: {format(new Date(lastUpdatedAt), "dd/MM HH:mm")}
                  </span>
                )}
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

            {profileReady ? <QualitativoTab filters={appliedFilters} /> : <div className="p-8 text-center text-sm text-muted-foreground">Carregando perfil…</div>}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
