import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { FiltersSidebar } from "@/components/dashboard/FiltersSidebar";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import {
  useCaptacaoData, useContasData, usePositivadorData, useReceitaMensalData,
} from "@/hooks/useDashboardData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, X, Users, ArrowUpRight, TrendingUp, BarChart3 } from "lucide-react";
import { useViewAs } from "@/contexts/ViewAsContext";

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

interface MetricRow {
  label: string;
  hubValue: number;
  pbiValue: string;
}

export default function AuditoriaComercial() {
  const { effectiveRole } = useViewAs();
  const {
    pendingFilters, appliedFilters, updatePendingFilter,
    applyFilters, resetFilters, hasChanges, activeChips, removeChip,
  } = useDashboardFilters();

  const { data: captacao } = useCaptacaoData(appliedFilters);
  const { data: contas } = useContasData(appliedFilters);
  const { data: positivador } = usePositivadorData(appliedFilters);
  const { data: receitaMensal } = useReceitaMensalData(appliedFilters);

  const [pbiValues, setPbiValues] = useState<Record<string, string>>({});

  // Compute HUB KPIs
  const hubKPIs = useMemo(() => {
    let migracao = 0, habilitacao = 0, ativacao = 0;
    (contas ?? []).forEach((r: any) => {
      const t = (r.tipo || "").toLowerCase();
      if (t.includes("migra")) migracao++;
      else if (t.includes("habilit")) habilitacao++;
      else if (t.includes("ativa")) ativacao++;
    });

    const now = new Date();
    const curMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    let mtd = 0, ytd = 0;
    (captacao ?? []).forEach((r: any) => {
      const val = Number(r.captacao) || 0;
      ytd += val;
      if (r.ano_mes === curMonth) mtd += val;
    });

    let aucTotal = 0;
    (positivador ?? []).forEach((r: any) => {
      aucTotal += Number(r.net_em_m) || 0;
    });

    let receitaTotal = 0;
    (receitaMensal ?? []).forEach((r: any) => {
      receitaTotal += Number(r.comissao_total) || 0;
    });

    return [
      { label: "Migração", hubValue: migracao },
      { label: "Habilitação", hubValue: habilitacao },
      { label: "Ativação", hubValue: ativacao },
      { label: "Captação Líq. MTD", hubValue: mtd },
      { label: "Captação Líq. YTD", hubValue: ytd },
      { label: "AuC Total", hubValue: aucTotal },
      { label: "Receita Tailor", hubValue: receitaTotal },
    ] as MetricRow[];
  }, [contas, captacao, positivador, receitaMensal]);

  const exportCSV = () => {
    const header = "Métrica,Valor HUB,Valor PBI,Diferença,% Dif\n";
    const rows = hubKPIs.map(kpi => {
      const pbi = Number(pbiValues[kpi.label] || "0") || 0;
      const diff = kpi.hubValue - pbi;
      const pctDiff = pbi !== 0 ? ((diff / pbi) * 100).toFixed(2) : "N/A";
      return `"${kpi.label}",${kpi.hubValue},${pbi},${diff},${pctDiff}%`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "auditoria_comercial.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (effectiveRole !== "ADMIN" && effectiveRole !== "LIDER") {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p style={{ color: "#6B7280" }}>Acesso restrito a administradores.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ backgroundColor: "#F2F2F2", minHeight: "calc(100vh - 64px)", margin: "-1.5rem", padding: "0" }}>
        <div className="flex">
          <FiltersSidebar
            pendingFilters={pendingFilters}
            updatePendingFilter={updatePendingFilter}
            applyFilters={applyFilters}
            resetFilters={resetFilters}
            hasChanges={hasChanges}
            open={true}
            onClose={() => {}}
          />

          <div className="flex-1 min-w-0 p-4">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-base font-semibold" style={{ color: "#1B2A3D" }}>Auditoria Comercial</h1>
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={exportCSV}>
                <Download className="h-3 w-3 mr-1" /> Exportar CSV
              </Button>
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

            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
              <MetricCard title="Migração" value={hubKPIs[0]?.hubValue ?? 0} icon={Users} />
              <MetricCard title="Habilitação" value={hubKPIs[1]?.hubValue ?? 0} icon={Users} />
              <MetricCard title="Ativação" value={hubKPIs[2]?.hubValue ?? 0} icon={Users} />
              <MetricCard title="AuC Total" value={fmtBRL(hubKPIs[5]?.hubValue ?? 0)} icon={BarChart3} />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
              <MetricCard title="Captação Líq. MTD" value={fmtBRL(hubKPIs[3]?.hubValue ?? 0)} icon={ArrowUpRight} />
              <MetricCard title="Captação Líq. YTD" value={fmtBRL(hubKPIs[4]?.hubValue ?? 0)} icon={TrendingUp} />
              <MetricCard title="Receita Tailor" value={fmtBRL(hubKPIs[6]?.hubValue ?? 0)} icon={TrendingUp} />
            </div>

            {/* Comparison table */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#374151" }}>
                  Comparação com Power BI
                </p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow style={{ backgroundColor: "#F3F4F6" }}>
                      <TableHead className="text-[10px] py-1.5">Métrica</TableHead>
                      <TableHead className="text-[10px] py-1.5 text-right">Valor HUB</TableHead>
                      <TableHead className="text-[10px] py-1.5 text-right">Valor PBI</TableHead>
                      <TableHead className="text-[10px] py-1.5 text-right">Diferença</TableHead>
                      <TableHead className="text-[10px] py-1.5 text-right">% Dif</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hubKPIs.map((kpi, i) => {
                      const pbiNum = Number(pbiValues[kpi.label] || "0") || 0;
                      const diff = kpi.hubValue - pbiNum;
                      const pctDiff = pbiNum !== 0 ? Math.abs(diff / pbiNum) * 100 : 0;
                      const hasPbi = pbiValues[kpi.label] && pbiValues[kpi.label] !== "";
                      const isGood = hasPbi && pctDiff < 1;
                      const isBad = hasPbi && pctDiff > 5;

                      return (
                        <TableRow key={kpi.label} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#F9FAFB" }}>
                          <TableCell className="text-[10px] py-1.5 font-medium">{kpi.label}</TableCell>
                          <TableCell className="text-[10px] py-1.5 text-right font-mono">
                            {Math.abs(kpi.hubValue) > 100 ? fmtBRL(kpi.hubValue) : kpi.hubValue}
                          </TableCell>
                          <TableCell className="text-[10px] py-1.5 text-right">
                            <Input
                              className="h-6 w-28 text-[10px] text-right ml-auto"
                              placeholder="Cole aqui"
                              value={pbiValues[kpi.label] || ""}
                              onChange={(e) => setPbiValues(prev => ({ ...prev, [kpi.label]: e.target.value }))}
                            />
                          </TableCell>
                          <TableCell className="text-[10px] py-1.5 text-right font-mono" style={{
                            color: isGood ? "#10B981" : isBad ? "#EF4444" : "#374151"
                          }}>
                            {hasPbi ? (Math.abs(diff) > 100 ? fmtBRL(diff) : diff.toFixed(2)) : "—"}
                          </TableCell>
                          <TableCell className="text-[10px] py-1.5 text-right font-mono" style={{
                            color: isGood ? "#10B981" : isBad ? "#EF4444" : "#374151"
                          }}>
                            {hasPbi ? `${pctDiff.toFixed(2)}%` : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
