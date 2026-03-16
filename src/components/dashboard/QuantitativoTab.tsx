import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "./MetricCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DashboardFilters } from "@/hooks/useDashboardFilters";
import {
  useContasKpis, useContasAggMes, useContasTotalPorTipo,
  useCaptacaoKpis, useCaptacaoAggMes, useCaptacaoTreemap,
  useAucMes, useAucCasa,
  useFaixaPlClientes, useFaixaPlAuc,
  useReceitaKpi, useReceitaMesCategoria, useReceitaTreemapCategoria, useReceitaMatriz,
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
  // === Contas ===
  const { data: kpis, isLoading: kpisLoading } = useContasKpis(filters);
  const { data: contasAgg, isLoading: aggLoading } = useContasAggMes(filters);
  const { data: contasTipo, isLoading: tipoLoading } = useContasTotalPorTipo(filters);

  // === Captação ===
  const { data: captKpis, isLoading: captKpisLoading } = useCaptacaoKpis(filters);
  const { data: captAggMes, isLoading: captAggLoading } = useCaptacaoAggMes(filters);
  const { data: captTreemap, isLoading: captTreeLoading } = useCaptacaoTreemap(filters);

  // === AuC ===
  const { data: aucMes, isLoading: aucMesLoading } = useAucMes(filters);
  const { data: aucCasa, isLoading: aucCasaLoading } = useAucCasa(filters);

  // === Faixa PL ===
  const { data: faixaClientes, isLoading: faixaCliLoading } = useFaixaPlClientes(filters);
  const { data: faixaAuc, isLoading: faixaAucLoading } = useFaixaPlAuc(filters);

  // === Receita ===
  const { data: receitaKpi, isLoading: recKpiLoading } = useReceitaKpi(filters);
  const { data: receitaMesCat, isLoading: recMesCatLoading } = useReceitaMesCategoria(filters);
  const { data: receitaTreemap, isLoading: recTreeLoading } = useReceitaTreemapCategoria(filters);
  const { data: receitaMatriz, isLoading: recMatrizLoading } = useReceitaMatriz(filters);

  const loading = kpisLoading || aggLoading || tipoLoading || captKpisLoading || captAggLoading || captTreeLoading
    || aucMesLoading || aucCasaLoading || faixaCliLoading || faixaAucLoading
    || recKpiLoading || recMesCatLoading || recTreeLoading || recMatrizLoading;

  // === Contas por mês (pivot) ===
  const contasPorMes = useMemo(() => {
    if (!contasAgg?.length) return [];
    const map = new Map<number, { anomes_nome: string; Ativação: number; Habilitação: number; Migração: number }>();
    contasAgg.forEach((r: any) => {
      if (!map.has(r.anomes)) map.set(r.anomes, { anomes_nome: r.anomes_nome || String(r.anomes), Ativação: 0, Habilitação: 0, Migração: 0 });
      const row = map.get(r.anomes)!;
      const t = (r.tipo || "").toLowerCase();
      if (t.includes("ativa")) row.Ativação += Number(r.qtd) || 0;
      else if (t.includes("habilit")) row.Habilitação += Number(r.qtd) || 0;
      else if (t.includes("migra")) row.Migração += Number(r.qtd) || 0;
    });
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => ({ mes: v.anomes_nome, ...v }));
  }, [contasAgg]);

  // === Total por Tipo (pivot by casa) ===
  const { totalPorTipo, casasContas } = useMemo(() => {
    if (!contasTipo?.length) return { totalPorTipo: [], casasContas: [] };
    const casaSet = new Set<string>();
    const tipoMap = new Map<string, Record<string, number>>();
    contasTipo.forEach((r: any) => {
      const tipo = r.tipo || "Outros";
      const casa = r.casa || "Outros";
      casaSet.add(casa);
      if (!tipoMap.has(tipo)) tipoMap.set(tipo, {});
      tipoMap.get(tipo)![casa] = (tipoMap.get(tipo)![casa] || 0) + (Number(r.qtd) || 0);
    });
    return {
      totalPorTipo: [...tipoMap.entries()].map(([tipo, casas]) => ({ tipo, ...casas })),
      casasContas: [...casaSet].sort(),
    };
  }, [contasTipo]);

  // === Captação por mês (pivot) ===
  const { captacaoPorMesStacked, captacaoTipos } = useMemo(() => {
    if (!captAggMes?.length) return { captacaoPorMesStacked: [], captacaoTipos: [] };
    const tipos = new Set<string>();
    const map = new Map<number, { anomes_nome: string } & Record<string, number>>();
    captAggMes.forEach((r: any) => {
      const tipo = r.tipo_captacao || "Outros";
      tipos.add(tipo);
      if (!map.has(r.anomes)) map.set(r.anomes, { anomes_nome: r.anomes_nome } as any);
      const obj = map.get(r.anomes)!;
      (obj as any)[tipo] = ((obj as any)[tipo] || 0) + (Number(r.valor) || 0);
    });
    return {
      captacaoPorMesStacked: [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => ({ mes: v.anomes_nome, ...v })),
      captacaoTipos: [...tipos].sort(),
    };
  }, [captAggMes]);

  // === Captação treemap ===
  const captacaoPorTipo = useMemo(() => {
    if (!captTreemap?.length) return [];
    return captTreemap.map((r: any) => ({ name: r.tipo_captacao || "Outros", value: Math.abs(Number(r.valor) || 0) }));
  }, [captTreemap]);

  // === AuC por mês (line chart data) ===
  const aucMesData = useMemo(() => {
    if (!aucMes?.length) return [];
    return aucMes.map((r: any) => ({ mes: r.anomes_nome, auc: Number(r.auc) || 0 }));
  }, [aucMes]);

  // === AuC por casa (donut data) ===
  const aucCasaData = useMemo(() => {
    if (!aucCasa?.length) return [];
    return aucCasa.map((r: any) => ({ name: r.casa || "Outros", value: Number(r.auc) || 0 }));
  }, [aucCasa]);

  // === Faixa PL (horizontal bars) ===
  const faixaClientesData = useMemo(() => {
    if (!faixaClientes?.length) return [];
    return faixaClientes.map((r: any) => ({ faixa: r.faixa_pl, clientes: Number(r.clientes) || 0 }));
  }, [faixaClientes]);

  const faixaAucData = useMemo(() => {
    if (!faixaAuc?.length) return [];
    return faixaAuc.map((r: any) => ({ faixa: r.faixa_pl, auc: Number(r.auc) || 0 }));
  }, [faixaAuc]);

  // === Receita por mês x categoria (stacked bar) ===
  const { receitaPorMesStacked, receitaCategorias } = useMemo(() => {
    if (!receitaMesCat?.length) return { receitaPorMesStacked: [], receitaCategorias: [] };
    const cats = new Set<string>();
    const map = new Map<number, { anomes_nome: string } & Record<string, number>>();
    receitaMesCat.forEach((r: any) => {
      const cat = r.categoria || "Outros";
      cats.add(cat);
      if (!map.has(r.anomes)) map.set(r.anomes, { anomes_nome: r.anomes_nome } as any);
      (map.get(r.anomes) as any)[cat] = ((map.get(r.anomes) as any)[cat] || 0) + (Number(r.valor) || 0);
    });
    return {
      receitaPorMesStacked: [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => ({ mes: v.anomes_nome, ...v })),
      receitaCategorias: [...cats].sort(),
    };
  }, [receitaMesCat]);

  // === Receita treemap ===
  const receitaPorCategoria = useMemo(() => {
    if (!receitaTreemap?.length) return [];
    return receitaTreemap.map((r: any) => ({ name: r.categoria || "Outros", value: Math.abs(Number(r.valor) || 0) }));
  }, [receitaTreemap]);

  // === Receita matriz (table pivot by anomes) ===
  const { matrizTabela, matrizMeses } = useMemo(() => {
    if (!receitaMatriz?.length) return { matrizTabela: [], matrizMeses: [] };
    const mesesSet = new Set<string>();
    const docMap = new Map<string, { documento: string; casa: string; faixa_pl: string } & Record<string, number>>();
    receitaMatriz.forEach((r: any) => {
      const key = r.documento || "N/D";
      const mesKey = r.anomes_nome || String(r.anomes);
      mesesSet.add(mesKey);
      if (!docMap.has(key)) docMap.set(key, { documento: key, casa: r.casa || "", faixa_pl: r.faixa_pl || "" } as any);
      const obj = docMap.get(key)!;
      (obj as any)[`rec_${mesKey}`] = ((obj as any)[`rec_${mesKey}`] || 0) + (Number(r.receita) || 0);
      (obj as any)[`auc_${mesKey}`] = ((obj as any)[`auc_${mesKey}`] || 0) + (Number(r.auc) || 0);
    });
    const sortedMeses = [...mesesSet].sort();
    const rows = [...docMap.values()].map(row => {
      const total = sortedMeses.reduce((s, m) => s + ((row as any)[`rec_${m}`] || 0), 0);
      return { ...row, total };
    }).sort((a, b) => b.total - a.total);
    return { matrizTabela: rows, matrizMeses: sortedMeses };
  }, [receitaMatriz]);

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
      {/* Row 1: Contas KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <MetricCard title="Migração" value={kpis?.migracao ?? 0} icon={Users} />
        <MetricCard title="Habilitação" value={kpis?.habilitacao ?? 0} icon={Users} />
        <MetricCard title="Ativação" value={kpis?.ativacao ?? 0} icon={Users} />
      </div>

      {/* Row 2: Contas por Mês + Total por Tipo */}
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
        <MetricCard title="Captação Líq. MTD" value={fmtBRL(captKpis?.captacao_mtd ?? 0)} icon={ArrowUpRight} />
        <MetricCard title="Captação Líq. YTD" value={fmtBRL(captKpis?.captacao_ytd ?? 0)} icon={TrendingUp} />
      </div>

      {/* Row 4: Captação por mês + Treemap */}
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
            <Treemap data={captacaoPorTipo} dataKey="value" aspectRatio={1} content={<TreemapContent />} />
          </ResponsiveContainer>
        </PbiCard>
      </div>

      {/* Row 5: AuC por mês (line) + AuC por Casa (donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <PbiCard title="AuC por Mês">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={aucMesData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#6B7280" }} />
              <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="auc" name="AuC" stroke={PBI[0]} strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </PbiCard>
        <PbiCard title="AuC por Casa">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={aucCasaData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ strokeWidth: 0.5 }}>
                {aucCasaData.map((_, i) => (
                  <Cell key={i} fill={PBI[i % PBI.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
            </PieChart>
          </ResponsiveContainer>
        </PbiCard>
      </div>

      {/* Row 6: Faixa PL — # Clientes + AuC */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <PbiCard title="# Clientes por Faixa PL">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={faixaClientesData} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 5 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: "#6B7280" }} />
              <YAxis type="category" dataKey="faixa" tick={{ fontSize: 9, fill: "#6B7280" }} width={75} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="clientes" fill={PBI[0]} radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </PbiCard>
        <PbiCard title="AuC por Faixa PL">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={faixaAucData} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 5 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: "#6B7280" }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
              <YAxis type="category" dataKey="faixa" tick={{ fontSize: 9, fill: "#6B7280" }} width={75} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="auc" name="AuC" fill={PBI[1]} radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </PbiCard>
      </div>

      {/* Row 7: Receita Tailor card */}
      <MetricCard title="Receita Bruta Tailor" value={fmtBRL(receitaKpi?.receita_total ?? 0)} icon={TrendingUp} />

      {/* Row 8: Receita Matriz */}
      <PbiCard title="Receita por Documento x Mês">
        <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ backgroundColor: "#F3F4F6" }}>
                <TableHead className="text-[10px] py-1 sticky left-0" style={{ backgroundColor: "#F3F4F6" }}>Documento</TableHead>
                <TableHead className="text-[10px] py-1">Casa</TableHead>
                <TableHead className="text-[10px] py-1">Faixa PL</TableHead>
                {matrizMeses.map(m => (
                  <TableHead key={m} className="text-[10px] py-1 text-right">{m}</TableHead>
                ))}
                <TableHead className="text-[10px] py-1 text-right font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrizTabela.slice(0, 100).map((row: any, i) => (
                <TableRow key={row.documento} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#F9FAFB" }}>
                  <TableCell className="text-[10px] py-1 sticky left-0 font-medium" style={{ backgroundColor: "inherit" }}>{row.documento}</TableCell>
                  <TableCell className="text-[10px] py-1">{row.casa}</TableCell>
                  <TableCell className="text-[10px] py-1">{row.faixa_pl}</TableCell>
                  {matrizMeses.map(m => (
                    <TableCell key={m} className="text-[10px] py-1 text-right">{fmtBRL(row[`rec_${m}`] || 0)}</TableCell>
                  ))}
                  <TableCell className="text-[10px] py-1 text-right font-bold">{fmtBRL(row.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </PbiCard>

      {/* Row 9: Receita stacked + Treemap */}
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
            <Treemap data={receitaPorCategoria} dataKey="value" aspectRatio={1} content={<TreemapContent />} />
          </ResponsiveContainer>
        </PbiCard>
      </div>
    </div>
  );
}
