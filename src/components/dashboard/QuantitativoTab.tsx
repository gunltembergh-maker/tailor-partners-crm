import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "./MetricCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DashboardFilters } from "@/hooks/useDashboardFilters";
import {
  useContasKpis, useContasAggMes, useContasTotalPorTipo,
  useCaptacaoData, usePositivadorData,
  useReceitaMensalData, useReceitaDetalhadaData,
} from "@/hooks/useDashboardData";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Treemap,
} from "recharts";
import { ArrowUpRight, Users, TrendingUp } from "lucide-react";

const PBI = ["#4472C4", "#ED7D31", "#A5A5A5", "#FFC000", "#5B9BD5", "#70AD47", "#264478", "#9B59B6", "#636363", "#D63B36"];

interface Props { filters: DashboardFilters; }

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

function PbiCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden ${className ?? ""}`}>
      <div className="px-3 py-1.5 border-b border-gray-100">
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#374151" }}>{title}</p>
      </div>
      <div className="p-2">{children}</div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded px-2.5 py-1.5 shadow-md">
      <p className="text-[10px] font-semibold mb-0.5" style={{ color: "#1B2A3D" }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-[10px]" style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" && Math.abs(p.value) > 100 ? fmtBRL(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

const TreemapContent = ({ x, y, width, height, name, value, index }: any) => {
  if (width < 30 || height < 20) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={PBI[index % PBI.length]} stroke="#fff" strokeWidth={2} rx={2} />
      {width > 50 && height > 30 && (
        <>
          <text x={x + width / 2} y={y + height / 2 - 5} textAnchor="middle" fill="#fff" fontSize={9} fontWeight="bold">
            {name}
          </text>
          <text x={x + width / 2} y={y + height / 2 + 8} textAnchor="middle" fill="#fff" fontSize={8}>
            {fmtBRL(value)}
          </text>
        </>
      )}
    </g>
  );
};

export function QuantitativoTab({ filters }: Props) {
  // === Row 1 & 2: Contas via RPCs ===
  const { data: kpis, isLoading: kpisLoading } = useContasKpis(filters);
  const { data: contasAgg, isLoading: aggLoading } = useContasAggMes(filters);
  const { data: contasTipo, isLoading: tipoLoading } = useContasTotalPorTipo(filters);

  // === Remaining sections: existing view-based hooks ===
  const { data: captacao, isLoading: captLoading } = useCaptacaoData(filters);
  const { data: positivador, isLoading: posLoading } = usePositivadorData(filters);
  const { data: receitaMensal, isLoading: recMLoading } = useReceitaMensalData(filters);
  const { data: receitaDet, isLoading: recDLoading } = useReceitaDetalhadaData(filters);

  const loading = kpisLoading || aggLoading || tipoLoading || captLoading || posLoading || recMLoading || recDLoading;

  // === Contas por mês (pivot RPC data) ===
  const contasPorMes = useMemo(() => {
    if (!contasAgg?.length) return [];
    const map = new Map<number, { anomes_nome: string; Ativação: number; Habilitação: number; Migração: number }>();
    contasAgg.forEach((r: any) => {
      if (!map.has(r.anomes)) {
        map.set(r.anomes, { anomes_nome: r.anomes_nome || String(r.anomes), Ativação: 0, Habilitação: 0, Migração: 0 });
      }
      const row = map.get(r.anomes)!;
      const t = (r.tipo || "").toLowerCase();
      if (t.includes("ativa")) row.Ativação += Number(r.qtd) || 0;
      else if (t.includes("habilit")) row.Habilitação += Number(r.qtd) || 0;
      else if (t.includes("migra")) row.Migração += Number(r.qtd) || 0;
    });
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, v]) => ({ mes: v.anomes_nome, ...v }));
  }, [contasAgg]);

  // === Total por Tipo (pivot RPC data by casa) ===
  const { totalPorTipo, casasContas } = useMemo(() => {
    if (!contasTipo?.length) return { totalPorTipo: [], casasContas: [] };
    const casaSet = new Set<string>();
    const tipoMap = new Map<string, Record<string, number>>();
    contasTipo.forEach((r: any) => {
      const tipo = r.tipo || "Outros";
      const casa = r.casa || "Outros";
      casaSet.add(casa);
      if (!tipoMap.has(tipo)) tipoMap.set(tipo, {});
      const obj = tipoMap.get(tipo)!;
      obj[casa] = (obj[casa] || 0) + (Number(r.qtd) || 0);
    });
    return {
      totalPorTipo: [...tipoMap.entries()].map(([tipo, casas]) => ({ tipo, ...casas })),
      casasContas: [...casaSet].sort(),
    };
  }, [contasTipo]);

  // === Captação metrics ===
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

  // === Captação por mês (stacked bar by tipo_captacao) ===
  const { captacaoPorMesStacked, captacaoTipos } = useMemo(() => {
    if (!captacao) return { captacaoPorMesStacked: [], captacaoTipos: [] };
    const tipos = new Set<string>();
    const map = new Map<string, Record<string, number>>();
    captacao.forEach((r: any) => {
      const mes = r.ano_mes || "";
      const tipo = r.tipo_captacao || "Outros";
      tipos.add(tipo);
      if (!map.has(mes)) map.set(mes, {});
      const obj = map.get(mes)!;
      obj[tipo] = (obj[tipo] || 0) + (Number(r.captacao) || 0);
    });
    return {
      captacaoPorMesStacked: [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
        .map(([mes, v]) => ({ mes: fmtMes(mes), ...v })),
      captacaoTipos: [...tipos].sort(),
    };
  }, [captacao]);

  // === Captação por tipo (treemap) ===
  const captacaoPorTipo = useMemo(() => {
    if (!captacao) return [];
    const map = new Map<string, number>();
    captacao.forEach((r: any) => {
      const k = r.tipo_captacao || "Outros";
      map.set(k, (map.get(k) || 0) + Math.abs(Number(r.captacao) || 0));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [captacao]);

  // === AuC por mês ===
  const { aucPorMesMulti, aucCasas } = useMemo(() => {
    if (!positivador) return { aucPorMesMulti: [], aucCasas: [] };
    const casaSet = new Set<string>();
    const map = new Map<string, Record<string, number>>();
    positivador.forEach((r: any) => {
      const mes = r.ano_mes || "";
      const casa = r.casa || "Outros";
      casaSet.add(casa);
      if (!map.has(mes)) map.set(mes, {});
      const obj = map.get(mes)!;
      obj[casa] = (obj[casa] || 0) + (Number(r.net_em_m) || 0);
    });
    return {
      aucPorMesMulti: [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
        .map(([mes, v]) => ({ mes: fmtMes(mes), ...v })),
      aucCasas: [...casaSet].sort(),
    };
  }, [positivador]);

  // === AuC por Casa (donut) ===
  const aucPorCasa = useMemo(() => {
    if (!positivador) return [];
    const map = new Map<string, number>();
    positivador.forEach((r: any) => {
      const k = r.casa || "Outros";
      map.set(k, (map.get(k) || 0) + (Number(r.net_em_m) || 0));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [positivador]);

  // === Faixa PL ===
  const { clientesFaixaMes, faixasPL } = useMemo(() => {
    if (!positivador) return { clientesFaixaMes: [], faixasPL: [] };
    const faixas = new Set<string>();
    const map = new Map<string, Map<string, Set<string>>>();
    positivador.forEach((r: any) => {
      const mes = r.ano_mes || "";
      const faixa = r.faixa_pl || "N/D";
      faixas.add(faixa);
      if (!map.has(mes)) map.set(mes, new Map());
      const fMap = map.get(mes)!;
      if (!fMap.has(faixa)) fMap.set(faixa, new Set());
      if (r.documento) fMap.get(faixa)!.add(r.documento);
    });
    const ordemMap = new Map<string, number>();
    positivador.forEach((r: any) => {
      if (r.faixa_pl && r.ordem_pl != null) ordemMap.set(r.faixa_pl, Number(r.ordem_pl));
    });
    const sortedFaixas = [...faixas].sort((a, b) => (ordemMap.get(a) || 99) - (ordemMap.get(b) || 99));
    return {
      clientesFaixaMes: [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
        .map(([mes, fMap]) => {
          const row: any = { mes: fmtMes(mes) };
          sortedFaixas.forEach(f => { row[f] = fMap.get(f)?.size || 0; });
          return row;
        }),
      faixasPL: sortedFaixas,
    };
  }, [positivador]);

  const aucFaixaMes = useMemo(() => {
    if (!positivador || !faixasPL.length) return [];
    const map = new Map<string, Record<string, number>>();
    positivador.forEach((r: any) => {
      const mes = r.ano_mes || "";
      const faixa = r.faixa_pl || "N/D";
      if (!map.has(mes)) map.set(mes, {});
      const obj = map.get(mes)!;
      obj[faixa] = (obj[faixa] || 0) + (Number(r.net_em_m) || 0);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([mes, v]) => ({ mes: fmtMes(mes), ...v }));
  }, [positivador, faixasPL]);

  // === Receita ===
  const receitaTotal = useMemo(() => {
    if (!receitaMensal) return 0;
    return receitaMensal.reduce((s: number, r: any) => s + (Number(r.comissao_total) || 0), 0);
  }, [receitaMensal]);

  const { receitaTabela, receitaMeses } = useMemo(() => {
    if (!receitaDet) return { receitaTabela: [], receitaMeses: [] };
    const meses = new Set<string>();
    const map = new Map<string, Record<string, number>>();
    receitaDet.forEach((r: any) => {
      const cat = r.categoria || "Outros";
      const mes = r.mes_ano || "";
      meses.add(mes);
      if (!map.has(cat)) map.set(cat, {});
      const obj = map.get(cat)!;
      obj[mes] = (obj[mes] || 0) + (Number(r.comissao_bruta) || 0);
    });
    const sortedMeses = [...meses].sort();
    return {
      receitaTabela: [...map.entries()].sort((a, b) => {
        const totalA = Object.values(a[1]).reduce((s, v) => s + v, 0);
        const totalB = Object.values(b[1]).reduce((s, v) => s + v, 0);
        return totalB - totalA;
      }).map(([cat, mesMap]) => ({
        categoria: cat,
        ...mesMap,
        total: Object.values(mesMap).reduce((s, v) => s + v, 0),
      })),
      receitaMeses: sortedMeses,
    };
  }, [receitaDet]);

  const { receitaPorMesStacked, receitaCategorias } = useMemo(() => {
    if (!receitaDet) return { receitaPorMesStacked: [], receitaCategorias: [] };
    const cats = new Set<string>();
    const map = new Map<string, Record<string, number>>();
    receitaDet.forEach((r: any) => {
      const mes = r.mes_ano || "";
      const cat = r.categoria || "Outros";
      cats.add(cat);
      if (!map.has(mes)) map.set(mes, {});
      const obj = map.get(mes)!;
      obj[cat] = (obj[cat] || 0) + (Number(r.comissao_bruta) || 0);
    });
    return {
      receitaPorMesStacked: [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
        .map(([mes, v]) => ({ mes: fmtMes(mes), ...v })),
      receitaCategorias: [...cats].sort(),
    };
  }, [receitaDet]);

  const receitaPorCategoria = useMemo(() => {
    if (!receitaDet) return [];
    const map = new Map<string, number>();
    receitaDet.forEach((r: any) => {
      const k = r.categoria || "Outros";
      map.set(k, (map.get(k) || 0) + Math.abs(Number(r.comissao_bruta) || 0));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [receitaDet]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 bg-white rounded-lg" />)}
        </div>
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 bg-white rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Row 1: 3 metric cards from RPC */}
      <div className="grid grid-cols-3 gap-2">
        <MetricCard title="Migração" value={kpis?.migracao ?? 0} icon={Users} />
        <MetricCard title="Habilitação" value={kpis?.habilitacao ?? 0} icon={Users} />
        <MetricCard title="Ativação" value={kpis?.ativacao ?? 0} icon={Users} />
      </div>

      {/* Row 2: Contas por Mês (2/3) + Total por Tipo (1/3) — from RPCs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        <div className="lg:col-span-2">
          <PbiCard title="Contas">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={contasPorMes} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#6B7280" }} />
                <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Ativação" stackId="a" fill={PBI[0]} />
                <Bar dataKey="Habilitação" stackId="a" fill={PBI[1]} />
                <Bar dataKey="Migração" stackId="a" fill={PBI[2]} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </PbiCard>
        </div>
        <PbiCard title="Total por Tipo">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={totalPorTipo} layout="vertical" margin={{ top: 0, right: 5, left: 60, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="tipo" tick={{ fontSize: 9, fill: "#6B7280" }} width={55} />
              <Tooltip content={<CustomTooltip />} />
              {casasContas.map((casa, i) => (
                <Bar key={casa} dataKey={casa} stackId="a" fill={PBI[i % PBI.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </PbiCard>
      </div>

      {/* Row 3: Captação cards */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard title="Captação Líq. MTD" value={fmtBRL(captacaoMetrics.mtd)} icon={ArrowUpRight} />
        <MetricCard title="Captação Líq. YTD" value={fmtBRL(captacaoMetrics.ytd)} icon={TrendingUp} />
      </div>

      {/* Row 4: Captação por mês + Treemap tipo captação */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        <div className="lg:col-span-2">
          <PbiCard title="Captação por Mês">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={captacaoPorMesStacked} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#6B7280" }} />
                <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                {captacaoTipos.map((tipo, i) => (
                  <Bar key={tipo} dataKey={tipo} stackId="a" fill={PBI[i % PBI.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </PbiCard>
        </div>
        <PbiCard title="Tipo de Captação">
          <ResponsiveContainer width="100%" height={240}>
            <Treemap
              data={captacaoPorTipo}
              dataKey="value"
              aspectRatio={1}
              content={<TreemapContent />}
            />
          </ResponsiveContainer>
        </PbiCard>
      </div>

      {/* Row 5: AuC por mês (line) + AuC por Casa (donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <PbiCard title="AuC por Mês">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={aucPorMesMulti} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#6B7280" }} />
              <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {aucCasas.map((casa, i) => (
                <Line key={casa} type="monotone" dataKey={casa} stroke={PBI[i % PBI.length]} strokeWidth={2} dot={{ r: 2 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </PbiCard>
        <PbiCard title="AuC por Casa">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={aucPorCasa} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ strokeWidth: 0.5 }}>
                {aucPorCasa.map((_, i) => (
                  <Cell key={i} fill={PBI[i % PBI.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
            </PieChart>
          </ResponsiveContainer>
        </PbiCard>
      </div>

      {/* Row 6: # Clientes por Faixa PL + AuC por Faixa PL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <PbiCard title="# Clientes por Faixa PL">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={clientesFaixaMes} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#6B7280" }} />
              <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 9 }} />
              {faixasPL.map((faixa, i) => (
                <Bar key={faixa} dataKey={faixa} stackId="a" fill={PBI[i % PBI.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </PbiCard>
        <PbiCard title="AuC por Faixa PL">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={aucFaixaMes} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#6B7280" }} />
              <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 9 }} />
              {faixasPL.map((faixa, i) => (
                <Bar key={faixa} dataKey={faixa} stackId="a" fill={PBI[i % PBI.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </PbiCard>
      </div>

      {/* Row 7: Receita Tailor card */}
      <MetricCard title="Receita Bruta Tailor" value={fmtBRL(receitaTotal)} icon={TrendingUp} />

      {/* Row 8: Receita Bruta tabela */}
      <PbiCard title="Receita Bruta por Categoria x Mês">
        <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ backgroundColor: "#F3F4F6" }}>
                <TableHead className="text-[10px] py-1 sticky left-0" style={{ backgroundColor: "#F3F4F6" }}>Categoria</TableHead>
                {receitaMeses.map(m => (
                  <TableHead key={m} className="text-[10px] py-1 text-right">{fmtMes(m)}</TableHead>
                ))}
                <TableHead className="text-[10px] py-1 text-right font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receitaTabela.map((row: any, i) => (
                <TableRow key={row.categoria} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#F9FAFB" }}>
                  <TableCell className="text-[10px] py-1 sticky left-0 font-medium" style={{ backgroundColor: "inherit" }}>{row.categoria}</TableCell>
                  {receitaMeses.map(m => (
                    <TableCell key={m} className="text-[10px] py-1 text-right">{fmtBRL(row[m] || 0)}</TableCell>
                  ))}
                  <TableCell className="text-[10px] py-1 text-right font-bold">{fmtBRL(row.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </PbiCard>

      {/* Row 9: Receita stacked + Treemap por categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <PbiCard title="Receita Bruta por Mês">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={receitaPorMesStacked} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#6B7280" }} />
              <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} tickFormatter={(v) => `${(v / 1e3).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 9 }} />
              {receitaCategorias.map((cat, i) => (
                <Bar key={cat} dataKey={cat} stackId="a" fill={PBI[i % PBI.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </PbiCard>
        <PbiCard title="Receita por Categoria">
          <ResponsiveContainer width="100%" height={240}>
            <Treemap
              data={receitaPorCategoria}
              dataKey="value"
              aspectRatio={1}
              content={<TreemapContent />}
            />
          </ResponsiveContainer>
        </PbiCard>
      </div>
    </div>
  );
}
