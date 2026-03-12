import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "./MetricCard";
import type { DashboardFilters } from "@/hooks/useDashboardFilters";
import {
  useCaptacaoData,
  useContasData,
  usePositivadorData,
  useReceitaMensalData,
  useReceitaDetalhadaData,
} from "@/hooks/useDashboardData";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { ArrowUpRight, Users, TrendingUp } from "lucide-react";

const PBI_COLORS = ["hsl(var(--accent))", "hsl(var(--tailor-copper))", "hsl(var(--muted-foreground))", "hsl(var(--tailor-warning))"];
const PBI_BLUE = "hsl(var(--accent))";
const PBI_ORANGE = "hsl(var(--tailor-copper))";

interface Props {
  filters: DashboardFilters;
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

function fmtMes(anoMes: string) {
  if (!anoMes || anoMes.length < 6) return anoMes;
  const m = anoMes.slice(4, 6);
  const y = anoMes.slice(2, 4);
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${meses[parseInt(m, 10) - 1]}/${y}`;
}

function PbiCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded bg-card overflow-hidden">
      <div className="px-3 py-1.5 border-b border-border">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      </div>
      <div className="p-2">{children}</div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded px-2.5 py-1.5 shadow-md">
      <p className="text-[10px] font-semibold text-foreground mb-0.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-[10px]" style={{ color: p.color }}>
          {p.name}: {fmtBRL(p.value)}
        </p>
      ))}
    </div>
  );
};

export function QuantitativoTab({ filters }: Props) {
  const { data: captacao, isLoading: captLoading } = useCaptacaoData(filters);
  const { data: contas, isLoading: contasLoading } = useContasData(filters);
  const { data: positivador, isLoading: posLoading } = usePositivadorData(filters);
  const { data: receitaMensal, isLoading: recMLoading } = useReceitaMensalData(filters);
  const { data: receitaDet, isLoading: recDLoading } = useReceitaDetalhadaData(filters);

  const loading = captLoading || contasLoading || posLoading || recMLoading || recDLoading;

  // Contas metrics
  const contasMetrics = useMemo(() => {
    if (!contas) return { migracao: 0, habilitacao: 0, ativacao: 0 };
    let migracao = 0, habilitacao = 0, ativacao = 0;
    contas.forEach((r: any) => {
      const t = (r.tipo || "").toLowerCase();
      if (t.includes("migra")) migracao++;
      else if (t.includes("habilit")) habilitacao++;
      else if (t.includes("ativa")) ativacao++;
    });
    return { migracao, habilitacao, ativacao };
  }, [contas]);

  // Captação metrics
  const captacaoMetrics = useMemo(() => {
    if (!captacao) return { mtd: 0, ytd: 0 };
    const now = new Date();
    const curMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    let mtd = 0, ytd = 0;
    captacao.forEach((r: any) => {
      const val = Number(r.captacao) || 0;
      ytd += val;
      if (r.ano_mes === curMonth) mtd += val;
    });
    return { mtd, ytd };
  }, [captacao]);

  // Captação por mês
  const captacaoPorMes = useMemo(() => {
    if (!captacao) return [];
    const map = new Map<string, { aporte: number; resgate: number; captacao: number }>();
    captacao.forEach((r: any) => {
      const k = r.ano_mes || "";
      const prev = map.get(k) || { aporte: 0, resgate: 0, captacao: 0 };
      map.set(k, {
        aporte: prev.aporte + (Number(r.aporte) || 0),
        resgate: prev.resgate + (Number(r.resgate) || 0),
        captacao: prev.captacao + (Number(r.captacao) || 0),
      });
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([mes, v]) => ({
      mes: fmtMes(mes),
      Aporte: v.aporte,
      Resgate: v.resgate,
      "Captação Líq.": v.captacao,
    }));
  }, [captacao]);

  // Captação por tipo
  const captacaoPorTipo = useMemo(() => {
    if (!captacao) return [];
    const map = new Map<string, number>();
    captacao.forEach((r: any) => {
      const k = r.tipo_captacao || "Outros";
      map.set(k, (map.get(k) || 0) + (Number(r.captacao) || 0));
    });
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [captacao]);

  // AuC por mês
  const aucPorMes = useMemo(() => {
    if (!positivador) return [];
    const map = new Map<string, number>();
    positivador.forEach((r: any) => {
      const k = r.ano_mes || "";
      map.set(k, (map.get(k) || 0) + (Number(r.net_em_m) || 0));
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([mes, net]) => ({
      mes: fmtMes(mes),
      "AuC (M)": net,
    }));
  }, [positivador]);

  // AuC por casa
  const aucPorCasa = useMemo(() => {
    if (!positivador) return [];
    const map = new Map<string, number>();
    positivador.forEach((r: any) => {
      const k = r.casa || "Outros";
      map.set(k, (map.get(k) || 0) + (Number(r.net_em_m) || 0));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([casa, net]) => ({ casa, net }));
  }, [positivador]);

  // Clientes/AuC por Faixa PL
  const aucPorFaixaPL = useMemo(() => {
    if (!positivador) return [];
    const map = new Map<string, { net: number; clientes: Set<string>; ordem: number }>();
    positivador.forEach((r: any) => {
      const k = r.faixa_pl || "N/D";
      const prev = map.get(k) || { net: 0, clientes: new Set<string>(), ordem: Number(r.ordem_pl) || 99 };
      prev.net += Number(r.net_em_m) || 0;
      if (r.documento) prev.clientes.add(r.documento);
      map.set(k, prev);
    });
    return [...map.entries()]
      .sort((a, b) => a[1].ordem - b[1].ordem)
      .map(([faixa, v]) => ({ faixa, net: v.net, clientes: v.clientes.size }));
  }, [positivador]);

  // Receita por mês
  const receitaPorMes = useMemo(() => {
    if (!receitaMensal) return [];
    const map = new Map<string, number>();
    receitaMensal.forEach((r: any) => {
      const k = r.mes_ano || "";
      map.set(k, (map.get(k) || 0) + (Number(r.comissao_total) || 0));
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([mes, receita]) => ({
      mes: fmtMes(mes),
      Receita: receita,
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
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([categoria, receita]) => ({
      categoria,
      receita,
    }));
  }, [receitaDet]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-5 gap-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-64 col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Row 1: Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <MetricCard title="Migração" value={contasMetrics.migracao} icon={Users} />
        <MetricCard title="Habilitação" value={contasMetrics.habilitacao} icon={Users} />
        <MetricCard title="Ativação" value={contasMetrics.ativacao} icon={Users} />
        <MetricCard title="Captação MTD" value={fmtBRL(captacaoMetrics.mtd)} icon={ArrowUpRight} />
        <MetricCard title="Captação YTD" value={fmtBRL(captacaoMetrics.ytd)} icon={TrendingUp} />
      </div>

      {/* Row 2: Captação por Mês + Captação por Tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        <div className="lg:col-span-2">
          <PbiCard title="Captação por Mês">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={captacaoPorMes} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Aporte" fill={PBI_BLUE} radius={[2, 2, 0, 0]} />
                <Bar dataKey="Resgate" fill={PBI_ORANGE} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </PbiCard>
        </div>
        <PbiCard title="Captação por Tipo">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={captacaoPorTipo}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ strokeWidth: 0.5 }}
              >
                {captacaoPorTipo.map((_, i) => (
                  <Cell key={i} fill={PBI_COLORS[i % PBI_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
            </PieChart>
          </ResponsiveContainer>
        </PbiCard>
      </div>

      {/* Row 3: AuC por Mês + AuC por Casa */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <PbiCard title="AuC por Mês">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={aucPorMes} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="AuC (M)" stroke={PBI_BLUE} strokeWidth={2} dot={{ r: 3, fill: PBI_BLUE }} />
            </LineChart>
          </ResponsiveContainer>
        </PbiCard>
        <PbiCard title="AuC por Casa">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={aucPorCasa} layout="vertical" margin={{ top: 5, right: 10, left: 60, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
              <YAxis type="category" dataKey="casa" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={55} />
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
              <Bar dataKey="net" fill={PBI_BLUE} radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </PbiCard>
      </div>

      {/* Row 4: Faixa PL + Receita por Mês */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <PbiCard title="Clientes e AuC por Faixa PL">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={aucPorFaixaPL} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="faixa" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar yAxisId="left" dataKey="net" name="AuC (M)" fill={PBI_BLUE} radius={[2, 2, 0, 0]} />
              <Bar yAxisId="right" dataKey="clientes" name="# Clientes" fill={PBI_ORANGE} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </PbiCard>
        <PbiCard title="Receita Tailor por Mês">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={receitaPorMes} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1e3).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Receita" fill={PBI_BLUE} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </PbiCard>
      </div>

      {/* Row 5: Receita por Categoria */}
      <PbiCard title="Receita por Categoria">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={receitaPorCategoria} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fmtBRL(v)} />
            <YAxis type="category" dataKey="categoria" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={75} />
            <Tooltip formatter={(v: number) => fmtBRL(v)} />
            <Bar dataKey="receita" fill={PBI_BLUE} radius={[0, 2, 2, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </PbiCard>
    </div>
  );
}
