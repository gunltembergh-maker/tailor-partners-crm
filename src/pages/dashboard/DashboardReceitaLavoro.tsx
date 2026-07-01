import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  BarChart,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import { Calendar, ChevronRight, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/AppLayout";
import { TailorFrame } from "@/components/layout/TailorFrame";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

// ─── Helpers ────────────────────────────────────────────────────────────
const BRL = (v: number | null | undefined) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
const BRL_MI = (v: number | null | undefined) =>
  `R$ ${(Number(v || 0) / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} Mi`;
const PCT = (v: number | null | undefined) =>
  `${Number(v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const fmtTs = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

// ─── PbiCard reutilizável (mesmo padrão do QuantitativoTab) ─────────────
function PbiCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden ${className ?? ""}`}>
      <div className="px-3 py-1.5 border-b border-gray-100">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">{title}</p>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
      <div className="p-2">{children}</div>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────
export default function DashboardReceitaLavoro() {
  const hoje = new Date();
  const [ano, setAno] = useState<number>(hoje.getFullYear());
  const [periodo, setPeriodo] = useState<"MTD" | "YTD">("YTD");
  const mesAtual = hoje.getMonth() + 1;

  const anosDisponiveis = useMemo(() => {
    const atual = hoje.getFullYear();
    return [atual, atual - 1, atual - 2];
  }, [hoje]);

  // ─── Queries ──────────────────────────────────────────────────────────
  const kpisQ = useQuery({
    queryKey: ["lavoro-receita-kpis", ano, mesAtual, periodo],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_lavoro_receita_kpis" as any, {
        p_ano: ano,
        p_mes: mesAtual,
        p_periodo: periodo,
      });
      if (error) throw error;
      return (data?.[0] ?? null) as {
        receita_competencia: number;
        receita_caixa: number;
        meta_periodo: number;
        atingimento: number;
        defasagem: number;
      } | null;
    },
  });

  const serieQ = useQuery({
    queryKey: ["lavoro-receita-serie", ano],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_lavoro_receita_serie_mensal" as any, { p_ano: ano });
      if (error) throw error;
      return (data || []) as Array<{ mes: number; receita_competencia: number; receita_caixa: number; meta_mensal: number }>;
    },
  });

  const comparativoQ = useQuery({
    queryKey: ["lavoro-receita-comparativo", anosDisponiveis],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_lavoro_receita_comparativo_anual" as any, {
        p_anos: anosDisponiveis,
      });
      if (error) throw error;
      return (data || []) as Array<{ ano: number; mes: number; receita_competencia: number }>;
    },
  });

  const canalQ = useQuery({
    queryKey: ["lavoro-receita-canal", ano, mesAtual],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_lavoro_receita_por_canal" as any, { p_ano: ano, p_mes: mesAtual });
      if (error) throw error;
      return (data || []) as Array<{ tipo_de_ramo: string; receita: number }>;
    },
  });

  const ramoQ = useQuery({
    queryKey: ["lavoro-receita-ramo", ano, mesAtual],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_lavoro_receita_por_ramo" as any, { p_ano: ano, p_mes: mesAtual });
      if (error) throw error;
      return (data || []) as Array<{ ramo: string; receita: number }>;
    },
  });

  const ultimaAtQ = useQuery({
    queryKey: ["lavoro-ultima-atualizacao"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_lavoro_ultima_atualizacao" as any);
      if (error) throw error;
      return data as string | null;
    },
  });

  const isRefreshing =
    kpisQ.isFetching || serieQ.isFetching || comparativoQ.isFetching || canalQ.isFetching || ramoQ.isFetching;

  const handleRefresh = async () => {
    await Promise.all([kpisQ.refetch(), serieQ.refetch(), comparativoQ.refetch(), canalQ.refetch(), ramoQ.refetch(), ultimaAtQ.refetch()]);
    toast.success("Dados atualizados");
  };

  const kpis = kpisQ.data;
  const atingimento = Number(kpis?.atingimento || 0);
  const atingColor = atingimento >= 100 ? "#16a34a" : atingimento >= 80 ? "#f59e0b" : "#dc2626";

  // ─── Série mensal (12 meses) ─────────────────────────────────────────
  const serieChart = useMemo(() => {
    const src = serieQ.data || [];
    return Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1;
      const row = src.find((r) => Number(r.mes) === mes);
      return {
        mes: MESES[i],
        Competência: Number(row?.receita_competencia || 0),
        Caixa: Number(row?.receita_caixa || 0),
        Meta: Number(row?.meta_mensal || 0),
      };
    });
  }, [serieQ.data]);

  // ─── Comparativo anual (linha por ano) ───────────────────────────────
  const comparativoChart = useMemo(() => {
    const rows = comparativoQ.data || [];
    const anos = Array.from(new Set(rows.map((r) => Number(r.ano)))).sort();
    return {
      anos,
      data: Array.from({ length: 12 }, (_, i) => {
        const mes = i + 1;
        const point: Record<string, any> = { mes: MESES[i] };
        anos.forEach((a) => {
          const row = rows.find((r) => Number(r.ano) === a && Number(r.mes) === mes);
          point[String(a)] = Number(row?.receita_competencia || 0);
        });
        return point;
      }),
    };
  }, [comparativoQ.data]);

  // ─── Totais anuais (cards pequenos) ──────────────────────────────────
  const totaisAnuais = useMemo(() => {
    const rows = comparativoQ.data || [];
    const map = new Map<number, number>();
    rows.forEach((r) => {
      const a = Number(r.ano);
      map.set(a, (map.get(a) || 0) + Number(r.receita_competencia || 0));
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [comparativoQ.data]);

  const gaugeData = useMemo(() => {
    const receita = Number(kpis?.receita_competencia || 0);
    const meta = Number(kpis?.meta_periodo || 0);
    const pct = meta > 0 ? (receita / meta) * 100 : 0;
    return [{ name: "atingimento", value: Math.min(pct, 100), fill: atingColor }];
  }, [kpis, atingColor]);

  const CORES_LINHAS = ["#0A2337", "#4B6D88", "#73A7B7", "#9B6B4A"];

  return (
    <AppLayout>
      <style>{`
        .lavoro-receita { font-family: 'Source Sans 3', system-ui, sans-serif; color: #0A2337; }
        .lavoro-receita .title-serif { font-family: 'DM Serif Display', 'Playfair Display', Georgia, serif; font-weight: 400; color: #DFDBBE; }
      `}</style>
      <TailorFrame>
        <div className="lavoro-receita">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h1 className="title-serif" style={{ fontSize: 32, letterSpacing: "-0.5px", margin: 0 }}>
                Receita Lavoro Seguros
              </h1>
              <ChevronRight className="h-4 w-4 text-[#DFDBBE]/40" />
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-white/10 backdrop-blur-sm border border-white/15">
                <Calendar className="h-3.5 w-3.5 text-[#73A7B7]" />
                <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
                  <SelectTrigger className="bg-transparent border-0 h-6 w-[90px] focus:ring-0 p-0 text-[#DFDBBE]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {anosDisponiveis.map((a) => (
                      <SelectItem key={a} value={String(a)}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex rounded-md overflow-hidden border border-white/15">
                {(["MTD", "YTD"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriodo(p)}
                    className={`px-3 py-1 text-xs font-semibold ${
                      periodo === p ? "bg-[#73A7B7] text-[#082537]" : "bg-white/10 text-[#DFDBBE]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs flex items-center gap-1 text-[#DFDBBE]/80">
                <Clock className="h-3 w-3 text-[#73A7B7]" />
                Dados atualizados em: {fmtTs(ultimaAtQ.data)}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs gap-1 border-[#DFDBBE]/30 text-[#DFDBBE] bg-transparent hover:bg-white/10 hover:text-[#DFDBBE]"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
                Atualizar Dados
              </Button>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <MetricCard
              title={`Receita Competência (${periodo})`}
              value={BRL(kpis?.receita_competencia)}
              loading={kpisQ.isLoading}
            />
            <MetricCard
              title={`Recebido Caixa (${periodo})`}
              value={BRL(kpis?.receita_caixa)}
              loading={kpisQ.isLoading}
            />
            <MetricCard title={`Meta (${periodo})`} value={BRL(kpis?.meta_periodo)} loading={kpisQ.isLoading} />
            <MetricCard
              title="Atingimento"
              value={PCT(kpis?.atingimento)}
              loading={kpisQ.isLoading}
              headerRight={
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: atingColor, color: "#fff" }}
                >
                  {atingimento >= 100 ? "OK" : atingimento >= 80 ? "ATENÇÃO" : "ABAIXO"}
                </span>
              }
            />
            <MetricCard
              title="Defasagem (Comp - Caixa)"
              value={BRL(kpis?.defasagem)}
              loading={kpisQ.isLoading}
            />
          </div>

          {/* Gauge + Série mensal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
            <PbiCard title="Atingimento — Mês Corrente" subtitle={`Competência vs Meta — ${MESES[mesAtual - 1]}/${ano}`}>
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <RadialBarChart
                    innerRadius="70%"
                    outerRadius="100%"
                    data={gaugeData}
                    startAngle={180}
                    endAngle={0}
                    cx="50%"
                    cy="80%"
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar dataKey="value" background={{ fill: "#e5e7eb" } as any} cornerRadius={8} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="text-center -mt-16">
                  <p className="text-3xl font-bold" style={{ color: atingColor }}>
                    {PCT(kpis?.atingimento)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {BRL(kpis?.receita_competencia)} / {BRL(kpis?.meta_periodo)}
                  </p>
                </div>
              </div>
            </PbiCard>

            <PbiCard title="Receita Mensal" subtitle={`Competência x Caixa x Meta — ${ano}`} className="lg:col-span-2">
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <ComposedChart data={serieChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => BRL(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Competência" fill="#0A2337" />
                    <Bar dataKey="Caixa" fill="#73A7B7" />
                    <Line type="monotone" dataKey="Meta" stroke="#9B6B4A" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </PbiCard>
          </div>

          {/* Comparativo anual + totais */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
            <PbiCard title="Comparativo Anual" subtitle="Receita Competência por ano" className="lg:col-span-2">
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <LineChart data={comparativoChart.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => BRL(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {comparativoChart.anos.map((a, i) => (
                      <Line
                        key={a}
                        type="monotone"
                        dataKey={String(a)}
                        stroke={CORES_LINHAS[i % CORES_LINHAS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </PbiCard>

            <div className="grid grid-cols-1 gap-3">
              {totaisAnuais.map(([a, total]) => (
                <MetricCard key={a} title={`Total ${a}`} value={BRL_MI(total)} subtitle="Receita Competência" />
              ))}
              {totaisAnuais.length === 0 && (
                <div className="text-xs text-white/60 p-2">Sem dados comparativos.</div>
              )}
            </div>
          </div>

          {/* Por Canal / Por Ramo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <PbiCard title="Receita por Canal (Tipo de Ramo)" subtitle={`YTD ${ano}`}>
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={canalQ.data || []} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="tipo_de_ramo" type="category" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip formatter={(v: any) => BRL(Number(v))} />
                    <Bar dataKey="receita" fill="#0A2337" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </PbiCard>

            <PbiCard title="Receita por Ramo" subtitle={`YTD ${ano}`}>
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={ramoQ.data || []} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="ramo" type="category" tick={{ fontSize: 11 }} width={140} />
                    <Tooltip formatter={(v: any) => BRL(Number(v))} />
                    <Bar dataKey="receita" fill="#73A7B7" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </PbiCard>
          </div>
        </div>
      </TailorFrame>
    </AppLayout>
  );
}
