import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "./MetricCard";
import { Users, ArrowUpRight, ArrowDownRight, TrendingUp, Briefcase, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import type { DashboardFilters } from "@/hooks/useDashboardFilters";
import { useCaptacaoData, useContasData, usePositivadorData, useReceitaMensalData, useReceitaDetalhadaData } from "@/hooks/useDashboardData";

const COLORS = [
  "hsl(210, 40%, 17%)", "hsl(210, 35%, 45%)", "hsl(20, 35%, 45%)",
  "hsl(142, 60%, 40%)", "hsl(38, 92%, 50%)", "hsl(0, 12%, 56%)",
  "hsl(280, 40%, 50%)", "hsl(160, 50%, 40%)",
];

function fmtBRL(v: number) {
  if (Math.abs(v) >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}K`;
  return `R$ ${v.toFixed(0)}`;
}

interface Props {
  filters: DashboardFilters;
}

export function QuantitativoTab({ filters }: Props) {
  const { data: captacao, isLoading: capLoading } = useCaptacaoData(filters);
  const { data: contas, isLoading: contLoading } = useContasData(filters);
  const { data: positivador, isLoading: posLoading } = usePositivadorData(filters);
  const { data: receitaMensal, isLoading: recMLoading } = useReceitaMensalData(filters);
  const { data: receitaDet, isLoading: recDLoading } = useReceitaDetalhadaData(filters);

  // Contas metrics
  const contasMetrics = useMemo(() => {
    if (!contas) return { migracao: 0, habilitacao: 0, ativacao: 0 };
    return {
      migracao: contas.filter((r: any) => r.tipo === "Migração").length,
      habilitacao: contas.filter((r: any) => r.tipo === "Habilitação").length,
      ativacao: contas.filter((r: any) => r.tipo === "Ativação").length,
    };
  }, [contas]);

  // Captação MTD/YTD
  const captMetrics = useMemo(() => {
    if (!captacao) return { mtd: 0, ytd: 0 };
    const now = new Date();
    const curMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const curYear = `${now.getFullYear()}`;
    const mtd = captacao.filter((r: any) => r.ano_mes === curMonth).reduce((s: number, r: any) => s + (Number(r.captacao) || 0), 0);
    const ytd = captacao.filter((r: any) => (r.ano_mes || "").startsWith(curYear)).reduce((s: number, r: any) => s + (Number(r.captacao) || 0), 0);
    return { mtd, ytd };
  }, [captacao]);

  // Captação por mês
  const captPorMes = useMemo(() => {
    if (!captacao) return [];
    const map = new Map<string, number>();
    captacao.forEach((r: any) => {
      const k = r.ano_mes || "N/A";
      map.set(k, (map.get(k) || 0) + (Number(r.captacao) || 0));
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([mes, val]) => ({
      mes: `${mes.slice(4)}/${mes.slice(0, 4)}`,
      captacao: val,
    }));
  }, [captacao]);

  // Captação por tipo
  const captPorTipo = useMemo(() => {
    if (!captacao) return [];
    const map = new Map<string, number>();
    captacao.forEach((r: any) => {
      const k = r.tipo_captacao || "Outro";
      map.set(k, (map.get(k) || 0) + (Number(r.captacao) || 0));
    });
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [captacao]);

  // AuC por mês (net_em_m from positivador, aggregated by ano_mes — take latest snapshot per doc per month)
  const aucPorMes = useMemo(() => {
    if (!positivador) return [];
    // Group by ano_mes, sum net_em_m per unique documento
    const byMonth = new Map<string, Map<string, number>>();
    positivador.forEach((r: any) => {
      const m = r.ano_mes || "N/A";
      if (!byMonth.has(m)) byMonth.set(m, new Map());
      const docMap = byMonth.get(m)!;
      docMap.set(r.documento, Number(r.net_em_m) || 0);
    });
    return [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([mes, docMap]) => ({
      mes: `${mes.slice(4)}/${mes.slice(0, 4)}`,
      auc: [...docMap.values()].reduce((s, v) => s + v, 0),
    }));
  }, [positivador]);

  // AuC por Casa
  const aucPorCasa = useMemo(() => {
    if (!positivador) return [];
    const map = new Map<string, number>();
    positivador.forEach((r: any) => {
      const k = r.casa || "Sem Casa";
      map.set(k, (map.get(k) || 0) + (Number(r.net_em_m) || 0));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [positivador]);

  // Faixa PL
  const faixaPL = useMemo(() => {
    if (!positivador) return [];
    const map = new Map<string, { count: number; auc: number; ordem: number }>();
    positivador.forEach((r: any) => {
      const k = r.faixa_pl || "N/A";
      const prev = map.get(k) || { count: 0, auc: 0, ordem: r.ordem_pl || 0 };
      map.set(k, { count: prev.count + 1, auc: prev.auc + (Number(r.net_em_m) || 0), ordem: r.ordem_pl || prev.ordem });
    });
    return [...map.entries()].sort((a, b) => a[1].ordem - b[1].ordem).map(([faixa, v]) => ({
      faixa,
      clientes: v.count,
      auc: v.auc,
    }));
  }, [positivador]);

  // Receita por mês
  const receitaPorMes = useMemo(() => {
    if (!receitaMensal) return [];
    const map = new Map<string, number>();
    receitaMensal.forEach((r: any) => {
      const k = r.mes_ano || "N/A";
      map.set(k, (map.get(k) || 0) + (Number(r.comissao_total) || 0));
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([mes, val]) => ({
      mes: `${mes.slice(4)}/${mes.slice(0, 4)}`,
      receita: val,
    }));
  }, [receitaMensal]);

  // Receita por categoria
  const receitaPorCategoria = useMemo(() => {
    if (!receitaDet) return [];
    const map = new Map<string, number>();
    receitaDet.forEach((r: any) => {
      const k = r.categoria || "Outros";
      map.set(k, (map.get(k) || 0) + (Number(r.comissao_bruta) || 0));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [receitaDet]);

  const loading = capLoading || contLoading;

  return (
    <div className="space-y-6">
      {/* Cards — Contas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard title="Migração" value={contasMetrics.migracao} icon={Users} loading={contLoading} />
        <MetricCard title="Habilitação" value={contasMetrics.habilitacao} icon={Users} loading={contLoading} />
        <MetricCard title="Ativação" value={contasMetrics.ativacao} icon={Users} loading={contLoading} />
        <MetricCard title="Captação MTD" value={fmtBRL(captMetrics.mtd)} icon={ArrowUpRight} loading={capLoading} />
        <MetricCard title="Captação YTD" value={fmtBRL(captMetrics.ytd)} icon={TrendingUp} loading={capLoading} />
      </div>

      {/* Row 1: Captação por mês + Captação por tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Captação por Mês</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={captPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtBRL(v)} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <Bar dataKey="captacao" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Captação por Tipo</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={captPorTipo} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                  {captPorTipo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: AuC por mês + AuC por Casa */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">AuC por Mês</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={aucPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtBRL(v)} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <Line type="monotone" dataKey="auc" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">AuC por Casa</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aucPorCasa} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => fmtBRL(v)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <Bar dataKey="value" fill="hsl(var(--tailor-copper))" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Faixa PL + Receita por mês */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Clientes e AuC por Faixa PL</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={faixaPL}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="faixa" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v) => fmtBRL(v)} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="clientes" fill="hsl(var(--primary))" name="# Clientes" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="right" dataKey="auc" fill="hsl(var(--accent))" name="AuC" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Receita Tailor por Mês</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={receitaPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtBRL(v)} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <Bar dataKey="receita" fill="hsl(var(--tailor-success))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Receita por Categoria */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Receita por Categoria</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={receitaPorCategoria} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => fmtBRL(v)} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
