import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import { LastUpdateBadges } from "@/components/dashboard/LastUpdateBadges";
import { FiltersSidebar } from "@/components/dashboard/FiltersSidebar";
import { QuantitativoTab } from "@/components/dashboard/QuantitativoTab";
import { QualitativoTab } from "@/components/dashboard/QualitativoTab";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";

export default function DashboardComercial() {
  const { filters, updateFilter, resetFilters } = useDashboardFilters();
  const [filtersOpen, setFiltersOpen] = useState(true);

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Dashboard Comercial</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Visão consolidada das bases importadas</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setFiltersOpen((p) => !p)}>
              <Filter className="h-4 w-4 mr-1" />
              Filtros
            </Button>
          </div>
        </div>

        {/* Last update badges */}
        <LastUpdateBadges />

        {/* Main content */}
        <div className="flex gap-0">
          <FiltersSidebar
            filters={filters}
            updateFilter={updateFilter}
            resetFilters={resetFilters}
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
          />
          <div className="flex-1 min-w-0">
            <Tabs defaultValue="quantitativo" className="w-full">
              <TabsList className="mb-4 ml-4">
                <TabsTrigger value="quantitativo">Quantitativo</TabsTrigger>
                <TabsTrigger value="qualitativo">Qualitativo</TabsTrigger>
              </TabsList>
              <TabsContent value="quantitativo" className="px-4">
                <QuantitativoTab filters={filters} />
              </TabsContent>
              <TabsContent value="qualitativo" className="px-4">
                <QualitativoTab filters={filters} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
