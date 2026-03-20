import { useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardFilters } from "@/hooks/useDashboardFilters";
import { useDiversificadorData, useReceitaDetalhadaData, useBaseCrmData, usePositivadorData, useReceitaMensalData } from "@/hooks/useDashboardData";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, Line, ComposedChart,
} from "recharts";

const PBI = ["#4472C4", "#ED7D31", "#A5A5A5", "#FFC000", "#5B9BD5", "#70AD47", "#264478", "#9B59B6"];

interface Props { filters: DashboardFilters; }

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}
function fmtNum(v: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(v);
}
function fmtPct(v: number) {
  return `${(v * 100).toFixed(2)}%`;
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
          {p.name}: {typeof p.value === "number" && Math.abs(p.value) > 100 ? fmtBRL(p.value) : fmtNum(p.value)}
        </p>
      ))}
    </div>
  );
};

export function QualitativoTab({ filters }: Props) {
  const { data: diversificador, isLoading: divLoading } = useDiversificadorData(filters);
  const { data: receitaDet, isLoading: recLoading } = useReceitaDetalhadaData(filters);
  const { data: baseCrm, isLoading: crmLoading } = useBaseCrmData(filters);
  const { data: positivador, isLoading: posLoading } = usePositivadorData(filters);
  const { data: receitaMensal, isLoading: recMLoading } = useReceitaMensalData(filters);

  const loading = divLoading || recLoading || crmLoading || posLoading || recMLoading;

  // === Clientes table ===
  const clientesTable = useMemo(() => {
    if (!baseCrm) return [];
    return baseCrm.slice(0, 200).map((r: any) => ({
      doc: r.codigo_cliente,
      nome: r.nome_cliente,
      plTailor: Number(r.pl_tailor) || 0,
      plDeclarado: Number(r.pl_declarado_ajustado) || 0,
      sow: Number(r.sow_ajustado) || 0,
      saldo: Number(r.saldo_consolidado) || 0,
      endereco: r.endereco_ajustado,
      banker: r.banker,
      advisor: r.assessor,
      tipo: r.canal,
    }));
  }, [baseCrm]);

  // === AuC por Faixa PL (combo: bar + line) ===
  const aucPorFaixaPL = useMemo(() => {
    if (!positivador) return [];
    const map = new Map<string, { net: number; pl: number; clientes: Set<string>; ordem: number }>();
    positivador.forEach((r: any) => {
      const k = r.faixa_pl || "N/D";
      const prev = map.get(k) || { net: 0, pl: 0, clientes: new Set<string>(), ordem: Number(r.ordem_pl) || 99 };
      prev.net += Number(r.net_em_m) || 0;
      prev.pl += Number(r.pl_declarado) || 0;
      if (r.documento) prev.clientes.add(r.documento);
      map.set(k, prev);
    });
    return [...map.entries()]
      .sort((a, b) => a[1].ordem - b[1].ordem)
      .map(([faixa, v]) => ({ faixa, NET: v.net, "PL Declarado": v.pl / 1e6, Clientes: v.clientes.size }));
  }, [positivador]);

  // === Custódia por Indexador (donut) ===
  const custodiaPorIndexador = useMemo(() => {
    if (!diversificador) return [];
    const map = new Map<string, number>();
    diversificador.forEach((r: any) => {
      const k = r.indexador || "Outros";
      map.set(k, (map.get(k) || 0) + (Number(r.net) || 0));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [diversificador]);

  // === Custódia por Veículo (donut) ===
  const custodiaPorVeiculo = useMemo(() => {
    if (!diversificador) return [];
    const map = new Map<string, number>();
    diversificador.forEach((r: any) => {
      const k = r.produto_ajustado || "Outros";
      map.set(k, (map.get(k) || 0) + (Number(r.net) || 0));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [diversificador]);

  // === Todos os Ativos table ===
  const ativosTable = useMemo(() => {
    if (!diversificador) return [];
    return diversificador.slice(0, 200).map((r: any) => ({
      doc: r.documento,
      conta: r.conta,
      ativo: r.ativo_ajustado,
      net: Number(r.net) || 0,
      indexador: r.indexador,
      veiculo: r.produto_ajustado,
      casa: r.casa,
      banker: r.banker,
      advisor: r.advisor,
      tipo: r.tipo_cliente,
    }));
  }, [diversificador]);

  // === Vencimentos (stacked bar by year) ===
  const vencimentosData = useMemo(() => {
    if (!diversificador) return [];
    const map = new Map<string, number>();
    diversificador.forEach((r: any) => {
      if (!r.vencimento) return;
      const year = String(r.vencimento).slice(0, 4);
      if (year.length === 4 && Number(year) > 2020) {
        map.set(year, (map.get(year) || 0) + (Number(r.net) || 0));
      }
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([ano, net]) => ({ ano, NET: net }));
  }, [diversificador]);

  // === Vencimentos table ===
  const vencimentosTable = useMemo(() => {
    if (!diversificador) return [];
    return diversificador
      .filter((r: any) => r.vencimento)
      .slice(0, 100)
      .map((r: any) => ({
        doc: r.documento,
        ativo: r.ativo_ajustado,
        vencimento: r.vencimento,
        net: Number(r.net) || 0,
        indexador: r.indexador,
        casa: r.casa,
      }));
  }, [diversificador]);

  // === ROA (PF vs PJ) ===
  const roaData = useMemo(() => {
    if (!receitaMensal || !positivador) return { pf: [] as any[], pj: [] as any[] };
    const recMap = new Map<string, number>();
    receitaMensal.forEach((r: any) => {
      const key = `${r.mes_ano}_${r.tipo_cliente || ""}`;
      recMap.set(key, (recMap.get(key) || 0) + (Number(r.comissao_total) || 0));
    });
    const aucMap = new Map<string, number>();
    positivador.forEach((r: any) => {
      const key = `${r.ano_mes}_${r.tipo_cliente || ""}`;
      aucMap.set(key, (aucMap.get(key) || 0) + (Number(r.net_em_m) || 0));
    });
    const meses = new Set<string>();
    receitaMensal.forEach((r: any) => { if (r.mes_ano) meses.add(r.mes_ano); });
    const pfData: any[] = [];
    const pjData: any[] = [];
    const sortedMeses = [...meses].sort();
    sortedMeses.forEach(mes => {
      const m = mes.slice(4, 6);
      const y = mes.slice(2, 4);
      const meses2 = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const label = `${meses2[parseInt(m, 10) - 1]}/${y}`;
      const recPF = recMap.get(`${mes}_PF`) || 0;
      const aucPF = aucMap.get(`${mes}_PF`) || 0;
      const recPJ = recMap.get(`${mes}_PJ`) || 0;
      const aucPJ = aucMap.get(`${mes}_PJ`) || 0;
      pfData.push({ mes: label, ROA: aucPF > 0 ? (recPF / aucPF) * 12 : 0 });
      pjData.push({ mes: label, ROA: aucPJ > 0 ? (recPJ / aucPJ) * 12 : 0 });
    });
    return { pf: pfData, pj: pjData };
  }, [receitaMensal, positivador]);

  if (loading) {
    return <TailorLoader overlay={false} />;
  }

  return (
    <div className="space-y-3">
      {/* Clientes table */}
      <PbiCard title="Clientes">
        <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ backgroundColor: "#F3F4F6" }}>
                <TableHead className="text-[10px] py-1">Documento</TableHead>
                <TableHead className="text-[10px] py-1">Nome</TableHead>
                <TableHead className="text-[10px] py-1 text-right">Saldo</TableHead>
                <TableHead className="text-[10px] py-1 text-right">PL Tailor</TableHead>
                <TableHead className="text-[10px] py-1 text-right">PL Declarado</TableHead>
                <TableHead className="text-[10px] py-1 text-right">SoW</TableHead>
                <TableHead className="text-[10px] py-1">Endereço</TableHead>
                <TableHead className="text-[10px] py-1">Banker</TableHead>
                <TableHead className="text-[10px] py-1">Advisor</TableHead>
                <TableHead className="text-[10px] py-1">Tipo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientesTable.map((r, i) => (
                <TableRow key={`${r.doc}-${i}`} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#F9FAFB" }}>
                  <TableCell className="text-[10px] py-1">{r.doc}</TableCell>
                  <TableCell className="text-[10px] py-1">{r.nome}</TableCell>
                  <TableCell className="text-[10px] py-1 text-right">{fmtBRL(r.saldo)}</TableCell>
                  <TableCell className="text-[10px] py-1 text-right">{fmtBRL(r.plTailor)}</TableCell>
                  <TableCell className="text-[10px] py-1 text-right">{fmtBRL(r.plDeclarado)}</TableCell>
                  <TableCell className="text-[10px] py-1 text-right">{fmtPct(r.sow)}</TableCell>
                  <TableCell className="text-[10px] py-1 truncate max-w-[120px]">{r.endereco}</TableCell>
                  <TableCell className="text-[10px] py-1">{r.banker}</TableCell>
                  <TableCell className="text-[10px] py-1">{r.advisor}</TableCell>
                  <TableCell className="text-[10px] py-1">{r.tipo}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </PbiCard>

      {/* AuC por Faixa PL (combo chart) */}
      <PbiCard title="AuC por Faixa de PL">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={aucPorFaixaPL} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="faixa" tick={{ fontSize: 9, fill: "#6B7280" }} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#6B7280" }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#6B7280" }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar yAxisId="left" dataKey="NET" fill={PBI[0]} radius={[2, 2, 0, 0]} />
            <Bar yAxisId="left" dataKey="PL Declarado" fill={PBI[1]} radius={[2, 2, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="Clientes" stroke={PBI[2]} strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </PbiCard>

      {/* Custódia donuts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <PbiCard title="Custódia por Indexador">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={custodiaPorIndexador} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ strokeWidth: 0.5 }}>
                {custodiaPorIndexador.map((_, i) => (
                  <Cell key={i} fill={PBI[i % PBI.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
            </PieChart>
          </ResponsiveContainer>
        </PbiCard>
        <PbiCard title="Custódia por Veículo">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={custodiaPorVeiculo} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ strokeWidth: 0.5 }}>
                {custodiaPorVeiculo.map((_, i) => (
                  <Cell key={i} fill={PBI[i % PBI.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
            </PieChart>
          </ResponsiveContainer>
        </PbiCard>
      </div>

      {/* Todos os Ativos */}
      <PbiCard title="Todos os Ativos">
        <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ backgroundColor: "#F3F4F6" }}>
                <TableHead className="text-[10px] py-1">Documento</TableHead>
                <TableHead className="text-[10px] py-1">Conta</TableHead>
                <TableHead className="text-[10px] py-1">Ativo Ajustado</TableHead>
                <TableHead className="text-[10px] py-1 text-right">NET</TableHead>
                <TableHead className="text-[10px] py-1">Indexador</TableHead>
                <TableHead className="text-[10px] py-1">Veículo</TableHead>
                <TableHead className="text-[10px] py-1">Casa</TableHead>
                <TableHead className="text-[10px] py-1">Banker</TableHead>
                <TableHead className="text-[10px] py-1">Advisor</TableHead>
                <TableHead className="text-[10px] py-1">Tipo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ativosTable.map((r, i) => (
                <TableRow key={`${r.doc}-${r.ativo}-${i}`} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#F9FAFB" }}>
                  <TableCell className="text-[10px] py-1">{r.doc}</TableCell>
                  <TableCell className="text-[10px] py-1">{r.conta}</TableCell>
                  <TableCell className="text-[10px] py-1 truncate max-w-[120px]">{r.ativo}</TableCell>
                  <TableCell className="text-[10px] py-1 text-right">{fmtBRL(r.net)}</TableCell>
                  <TableCell className="text-[10px] py-1">{r.indexador}</TableCell>
                  <TableCell className="text-[10px] py-1">{r.veiculo}</TableCell>
                  <TableCell className="text-[10px] py-1">{r.casa}</TableCell>
                  <TableCell className="text-[10px] py-1">{r.banker}</TableCell>
                  <TableCell className="text-[10px] py-1">{r.advisor}</TableCell>
                  <TableCell className="text-[10px] py-1">{r.tipo}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </PbiCard>

      {/* Vencimentos bar chart */}
      <PbiCard title="Vencimentos">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={vencimentosData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="ano" tick={{ fontSize: 10, fill: "#6B7280" }} />
            <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="NET" fill={PBI[0]} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </PbiCard>

      {/* Vencimentos table */}
      <PbiCard title="Vencimentos — Detalhado">
        <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ backgroundColor: "#F3F4F6" }}>
                <TableHead className="text-[10px] py-1">Documento</TableHead>
                <TableHead className="text-[10px] py-1">Ativo</TableHead>
                <TableHead className="text-[10px] py-1">Vencimento</TableHead>
                <TableHead className="text-[10px] py-1 text-right">NET</TableHead>
                <TableHead className="text-[10px] py-1">Indexador</TableHead>
                <TableHead className="text-[10px] py-1">Casa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vencimentosTable.map((r, i) => (
                <TableRow key={`${r.doc}-${r.ativo}-${i}`} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#F9FAFB" }}>
                  <TableCell className="text-[10px] py-1">{r.doc}</TableCell>
                  <TableCell className="text-[10px] py-1 truncate max-w-[120px]">{r.ativo}</TableCell>
                  <TableCell className="text-[10px] py-1">{r.vencimento}</TableCell>
                  <TableCell className="text-[10px] py-1 text-right">{fmtBRL(r.net)}</TableCell>
                  <TableCell className="text-[10px] py-1">{r.indexador}</TableCell>
                  <TableCell className="text-[10px] py-1">{r.casa}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </PbiCard>

      {/* ROA PF vs PJ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <PbiCard title="ROA Anualizado Ponderado — PF">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={roaData.pf} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#6B7280" }} />
              <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} tickFormatter={(v) => fmtPct(v)} />
              <Tooltip formatter={(v: number) => fmtPct(v)} />
              <Bar dataKey="ROA" fill={PBI[0]} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </PbiCard>
        <PbiCard title="ROA Anualizado Ponderado — PJ">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={roaData.pj} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#6B7280" }} />
              <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} tickFormatter={(v) => fmtPct(v)} />
              <Tooltip formatter={(v: number) => fmtPct(v)} />
              <Bar dataKey="ROA" fill={PBI[1]} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </PbiCard>
      </div>

      {/* NPS Placeholder */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex items-center gap-3">
        <Info className="h-5 w-5" style={{ color: "#9CA3AF" }} />
        <div>
          <p className="text-[11px] font-semibold" style={{ color: "#374151" }}>NPS</p>
          <p className="text-[10px]" style={{ color: "#6B7280" }}>Base ainda não importada. Importe a base de NPS para visualizar métricas.</p>
        </div>
      </div>

      {/* MtM RF Placeholder */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex items-center gap-3">
        <Info className="h-5 w-5" style={{ color: "#9CA3AF" }} />
        <div>
          <p className="text-[11px] font-semibold" style={{ color: "#374151" }}>Mark-to-Market Renda Fixa</p>
          <p className="text-[10px]" style={{ color: "#6B7280" }}>Base ainda não importada. Importe a base de Posição Renda Fixa para visualizar.</p>
        </div>
      </div>
    </div>
  );
}
