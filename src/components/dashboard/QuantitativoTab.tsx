import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "./MetricCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DashboardFilters } from "@/hooks/useDashboardFilters";
import {
  useContasKpis, useContasAggMes, useContasTotalPorTipo,
  useCaptacaoKpis, useCaptacaoAggMes, useCaptacaoTreemap,
  useAucMesStackCasa, useAucCasaM0,
  useFaixaPlClientesMes, useFaixaPlAucMes,
  useReceitaTotal, useReceitaMesCategoria, useReceitaTreemapCategoria, useReceitaMatrizRows,
} from "@/hooks/useDashboardData";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, Treemap,
} from "recharts";
import { ArrowUpRight, Users, TrendingUp, ChevronRight, ChevronDown } from "lucide-react";

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

const Percent100Tooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (Number(p.value) || 0), 0);
  return (
    <div className="bg-white border border-gray-200 rounded px-2.5 py-1.5 shadow-md">
      <p className="text-[10px] font-semibold mb-0.5" style={{ color: "#1B2A3D" }}>{label}</p>
      {payload.map((p: any, i: number) => {
        const pct = total > 0 ? ((Number(p.value) / total) * 100).toFixed(1) : "0";
        return (
          <p key={i} className="text-[10px]" style={{ color: p.color }}>
            {p.name}: {pct}%
          </p>
        );
      })}
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

/* ─── Pivot helper for stacked bars ─── */
function pivotStacked<T extends Record<string, any>>(
  data: T[],
  categoryKey: string,
  seriesKey: string,
  valueKey: string,
): { rows: Record<string, any>[]; series: string[] } {
  const seriesSet = new Set<string>();
  const map = new Map<string, Record<string, any>>();
  data.forEach((r) => {
    const cat = r[categoryKey] ?? "";
    const ser = r[seriesKey] ?? "Outros";
    seriesSet.add(ser);
    if (!map.has(cat)) map.set(cat, { _cat: cat });
    const row = map.get(cat)!;
    row[ser] = (row[ser] || 0) + (Number(r[valueKey]) || 0);
  });
  return { rows: [...map.values()], series: [...seriesSet].sort() };
}

/* ─── Receita Matriz tree builder ─── */
interface MatrizNode {
  key: string;
  label: string;
  depth: number;
  values: Record<string, number>;
  total: number;
  children: MatrizNode[];
}

function buildMatrizTree(data: any[]): { tree: MatrizNode[]; meses: string[] } {
  const mesesSet = new Set<string>();
  data.forEach((r: any) => mesesSet.add(r.anomes_nome || String(r.anomes)));
  const meses = [...mesesSet].sort();

  const catMap = new Map<string, Map<string, Map<string, Map<string, number[]>>>>();

  data.forEach((r: any) => {
    const cat = r.categoria || "N/D";
    const sub = r.subcategoria || "";
    const prod = r.produto || "";
    const subp = r.subproduto || "";
    const mesKey = r.anomes_nome || String(r.anomes);
    if (!catMap.has(cat)) catMap.set(cat, new Map());
    const subMap = catMap.get(cat)!;
    if (!subMap.has(sub)) subMap.set(sub, new Map());
    const prodMap = subMap.get(sub)!;
    if (!prodMap.has(prod)) prodMap.set(prod, new Map());
    const subpMap = prodMap.get(prod)!;
    if (!subpMap.has(subp)) subpMap.set(subp, []);
    // store [mesIndex, valor]
    const mesIdx = meses.indexOf(mesKey);
    subpMap.get(subp)!.push(mesIdx, Number(r.valor) || 0);
  });

  const tree: MatrizNode[] = [];
  for (const [cat, subMap] of catMap) {
    const catNode: MatrizNode = { key: cat, label: cat, depth: 0, values: {}, total: 0, children: [] };
    for (const [sub, prodMap] of subMap) {
      const subNode: MatrizNode = { key: `${cat}|${sub}`, label: sub || "(sem subcategoria)", depth: 1, values: {}, total: 0, children: [] };
      for (const [prod, subpMap] of prodMap) {
        const prodNode: MatrizNode = { key: `${cat}|${sub}|${prod}`, label: prod || "(sem produto)", depth: 2, values: {}, total: 0, children: [] };
        for (const [subp, pairs] of subpMap) {
          const subpNode: MatrizNode = { key: `${cat}|${sub}|${prod}|${subp}`, label: subp || "(sem subproduto)", depth: 3, values: {}, total: 0, children: [] };
          for (let i = 0; i < pairs.length; i += 2) {
            const mes = meses[pairs[i]];
            subpNode.values[mes] = (subpNode.values[mes] || 0) + pairs[i + 1];
            subpNode.total += pairs[i + 1];
          }
          prodNode.children.push(subpNode);
          meses.forEach(m => { prodNode.values[m] = (prodNode.values[m] || 0) + (subpNode.values[m] || 0); });
          prodNode.total += subpNode.total;
        }
        subNode.children.push(prodNode);
        meses.forEach(m => { subNode.values[m] = (subNode.values[m] || 0) + (prodNode.values[m] || 0); });
        subNode.total += prodNode.total;
      }
      catNode.children.push(subNode);
      meses.forEach(m => { catNode.values[m] = (catNode.values[m] || 0) + (subNode.values[m] || 0); });
      catNode.total += subNode.total;
    }
    tree.push(catNode);
  }
  tree.sort((a, b) => b.total - a.total);
  return { tree, meses };
}

function MatrizRowComponent({ node, meses, expanded, toggle }: { node: MatrizNode; meses: string[]; expanded: Set<string>; toggle: (k: string) => void }) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.key);
  const indent = node.depth * 16;
  const bgDepth = ["#F3F4F6", "#F9FAFB", "#FFF", "#FFF"];
  return (
    <>
      <TableRow style={{ backgroundColor: bgDepth[node.depth] || "#FFF" }}>
        <TableCell className="text-[10px] py-0.5 sticky left-0 whitespace-nowrap" style={{ paddingLeft: indent + 8, backgroundColor: bgDepth[node.depth], fontWeight: node.depth < 2 ? 600 : 400 }}>
          {hasChildren ? (
            <button onClick={() => toggle(node.key)} className="inline-flex items-center gap-0.5 hover:text-primary">
              {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {node.label}
            </button>
          ) : <span className="pl-3.5">{node.label}</span>}
        </TableCell>
        {meses.map(m => (
          <TableCell key={m} className="text-[10px] py-0.5 text-right">{fmtBRL(node.values[m] || 0)}</TableCell>
        ))}
        <TableCell className="text-[10px] py-0.5 text-right font-bold">{fmtBRL(node.total)}</TableCell>
      </TableRow>
      {isOpen && node.children.map(child => (
        <MatrizRowComponent key={child.key} node={child} meses={meses} expanded={expanded} toggle={toggle} />
      ))}
    </>
  );
}

export function QuantitativoTab({ filters }: Props) {
  // === Contas ===
  const { data: kpis, isLoading: kpisLoading } = useContasKpis(filters);
  const { data: contasAgg, isLoading: aggLoading } = useContasAggMes(filters);
  const { data: contasTipo, isLoading: tipoLoading } = useContasTotalPorTipo(filters);

  // === Captação ===
  const { data: captKpis, isLoading: captKpisLoading } = useCaptacaoKpis(filters);
  const { data: captAggMes, isLoading: captAggLoading } = useCaptacaoAggMes(filters);
  const { data: captTreemap, isLoading: captTreeLoading } = useCaptacaoTreemap(filters);

  // === AuC (PBIX) ===
  const { data: aucStackCasa, isLoading: aucStackLoading } = useAucMesStackCasa(filters);
  const { data: aucCasaM0, isLoading: aucCasaLoading } = useAucCasaM0(filters);

  // === Faixa PL (PBIX — por mês) ===
  const { data: faixaCliMes, isLoading: faixaCliLoading } = useFaixaPlClientesMes(filters);
  const { data: faixaAucMes, isLoading: faixaAucLoading } = useFaixaPlAucMes(filters);

  // === Receita (PBIX) ===
  const { data: receitaTotalData, isLoading: recTotalLoading } = useReceitaTotal(filters);
  const { data: receitaMesCat, isLoading: recMesCatLoading } = useReceitaMesCategoria(filters);
  const { data: receitaTreemap, isLoading: recTreeLoading } = useReceitaTreemapCategoria(filters);
  const { data: receitaMatrizRows, isLoading: recMatrizLoading } = useReceitaMatrizRows(filters);

  const loading = kpisLoading || aggLoading || tipoLoading || captKpisLoading || captAggLoading || captTreeLoading
    || aucStackLoading || aucCasaLoading || faixaCliLoading || faixaAucLoading
    || recTotalLoading || recMesCatLoading || recTreeLoading || recMatrizLoading;

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

  // === AuC por mês stacked by casa ===
  const { aucPorMesStacked, aucCasas } = useMemo(() => {
    if (!aucStackCasa?.length) return { aucPorMesStacked: [], aucCasas: [] };
    const { rows, series } = pivotStacked(aucStackCasa, "anomes_nome", "casa", "auc");
    return { aucPorMesStacked: rows, aucCasas: series };
  }, [aucStackCasa]);

  // === AuC por casa M0 (donut) ===
  const aucCasaData = useMemo(() => {
    if (!aucCasaM0?.length) return [];
    return aucCasaM0.map((r: any) => ({ name: r.casa || "Outros", value: Number(r.auc) || 0 }));
  }, [aucCasaM0]);

  // === Faixa PL Clientes por mês (100% stacked) ===
  const { faixaCliStacked, faixaPlSeries } = useMemo(() => {
    if (!faixaCliMes?.length) return { faixaCliStacked: [], faixaPlSeries: [] };
    // Sort by ordem_pl to get consistent series order
    const sorted = [...faixaCliMes].sort((a: any, b: any) => (a.ordem_pl || 0) - (b.ordem_pl || 0));
    const { rows, series } = pivotStacked(sorted, "anomes_nome", "faixa_pl", "clientes");
    // Re-sort series by ordem_pl
    const ordemMap = new Map<string, number>();
    sorted.forEach((r: any) => { if (!ordemMap.has(r.faixa_pl)) ordemMap.set(r.faixa_pl, r.ordem_pl || 0); });
    const sortedSeries = [...series].sort((a, b) => (ordemMap.get(a) || 0) - (ordemMap.get(b) || 0));
    return { faixaCliStacked: rows, faixaPlSeries: sortedSeries };
  }, [faixaCliMes]);

  // === Faixa PL AuC por mês (100% stacked) ===
  const faixaAucStacked = useMemo(() => {
    if (!faixaAucMes?.length) return [];
    const sorted = [...faixaAucMes].sort((a: any, b: any) => (a.ordem_pl || 0) - (b.ordem_pl || 0));
    const { rows } = pivotStacked(sorted, "anomes_nome", "faixa_pl", "auc");
    return rows;
  }, [faixaAucMes]);

  // === Receita por mês x categoria (stacked bar) ===
  const { receitaPorMesStacked, receitaCategorias } = useMemo(() => {
    if (!receitaMesCat?.length) return { receitaPorMesStacked: [], receitaCategorias: [] };
    const { rows, series } = pivotStacked(receitaMesCat, "anomes_nome", "categoria", "valor");
    return { receitaPorMesStacked: rows, receitaCategorias: series };
  }, [receitaMesCat]);

  // === Receita treemap ===
  const receitaPorCategoria = useMemo(() => {
    if (!receitaTreemap?.length) return [];
    return receitaTreemap.map((r: any) => ({ name: r.categoria || "Outros", value: Math.abs(Number(r.valor) || 0) }));
  }, [receitaTreemap]);

  // === Receita matriz (hierarchical pivot) ===
  const { matrizTree, matrizMeses } = useMemo(() => {
    if (!receitaMatrizRows?.length) return { matrizTree: [] as MatrizNode[], matrizMeses: [] as string[] };
    const { tree, meses } = buildMatrizTree(receitaMatrizRows);
    return { matrizTree: tree, matrizMeses: meses };
  }, [receitaMatrizRows]);

  const [matrizExpanded, setMatrizExpanded] = useState<Set<string>>(new Set());
  const toggleMatriz = (key: string) => {
    setMatrizExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

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

      {/* Row 5: AuC por mês (stacked by Casa) + AuC por Casa M0 (donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <PbiCard title="AuC por Mês (por Casa)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={aucPorMesStacked} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="_cat" tick={{ fontSize: 10, fill: "#6B7280" }} />
              <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 9 }} />
              {aucCasas.map((casa, i) => (
                <Bar key={casa} dataKey={casa} stackId="a" fill={PBI[i % PBI.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </PbiCard>
        <PbiCard title="AuC por Casa (M0)">
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

      {/* Row 6: Faixa PL — 100% stacked (# Clientes + AuC) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <PbiCard title="# Clientes por Faixa PL (100%)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={faixaCliStacked} stackOffset="expand" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="_cat" tick={{ fontSize: 10, fill: "#6B7280" }} />
              <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip content={<Percent100Tooltip />} />
              <Legend wrapperStyle={{ fontSize: 9 }} />
              {faixaPlSeries.map((faixa, i) => (
                <Bar key={faixa} dataKey={faixa} stackId="a" fill={PBI[i % PBI.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </PbiCard>
        <PbiCard title="AuC por Faixa PL (100%)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={faixaAucStacked} stackOffset="expand" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="_cat" tick={{ fontSize: 10, fill: "#6B7280" }} />
              <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip content={<Percent100Tooltip />} />
              <Legend wrapperStyle={{ fontSize: 9 }} />
              {faixaPlSeries.map((faixa, i) => (
                <Bar key={faixa} dataKey={faixa} stackId="a" fill={PBI[i % PBI.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </PbiCard>
      </div>

      {/* Row 7: Receita Tailor card */}
      <MetricCard title="Receita Bruta Tailor" value={fmtBRL(receitaTotalData?.receita ?? 0)} icon={TrendingUp} />

      {/* Row 8: Receita Matriz (hierarchical pivot) */}
      <PbiCard title="Receita por Categoria × Mês">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ backgroundColor: "#F3F4F6" }}>
                <TableHead className="text-[10px] py-1 sticky left-0" style={{ backgroundColor: "#F3F4F6", minWidth: 200 }}>Categoria / Produto</TableHead>
                {matrizMeses.map(m => (
                  <TableHead key={m} className="text-[10px] py-1 text-right">{m}</TableHead>
                ))}
                <TableHead className="text-[10px] py-1 text-right font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrizTree.map(node => (
                <MatrizRowComponent key={node.key} node={node} meses={matrizMeses} expanded={matrizExpanded} toggle={toggleMatriz} />
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
              <XAxis dataKey="_cat" tick={{ fontSize: 10, fill: "#6B7280" }} />
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
