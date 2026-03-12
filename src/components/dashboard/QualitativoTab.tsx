import { useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardFilters } from "@/hooks/useDashboardFilters";
import { useDiversificadorData, useReceitaDetalhadaData, useBaseCrmData, usePositivadorData, useReceitaMensalData } from "@/hooks/useDashboardData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const PBI_PALETTE = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--accent))",
  "hsl(var(--primary))", "hsl(var(--muted-foreground))",
];

interface Props {
  filters: DashboardFilters;
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}
function fmtNum(v: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(v);
}
function fmtPct(v: number) {
  return `${(v * 100).toFixed(2)}%`;
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

  // === AuC por Faixa PL (bar chart with NET + PL Declarado + # Clientes) ===
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

  // === Custódia por Veículo/Produto (donut) ===
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

  // === ROA Anualizado Ponderado (PF vs PJ) ===
  const roaData = useMemo(() => {
    if (!receitaMensal || !positivador) return { pf: [] as any[], pj: [] as any[] };
    // Group receita by mes_ano + tipo_cliente
    const recMap = new Map<string, number>();
    receitaMensal.forEach((r: any) => {
      const key = `${r.mes_ano}_${r.tipo_cliente || ""}`;
      recMap.set(key, (recMap.get(key) || 0) + (Number(r.comissao_total) || 0));
    });
    // Group AuC by mes + tipo_cliente
    const aucMap = new Map<string, number>();
    positivador.forEach((r: any) => {
      const key = `${r.ano_mes}_${r.tipo_cliente || ""}`;
      aucMap.set(key, (aucMap.get(key) || 0) + (Number(r.net_em_m) || 0));
    });
    // Compute ROA
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
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Row 1: Clientes table */}
      <PbiCard title="Clientes">
        <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
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
                <TableRow key={`${r.doc}-${i}`} className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}>
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

      {/* Row 2: AuC por Faixa PL */}
      <PbiCard title="AuC por Faixa de PL">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={aucPorFaixaPL} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="faixa" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar yAxisId="left" dataKey="NET" fill={PBI_PALETTE[0]} radius={[2, 2, 0, 0]} />
            <Bar yAxisId="left" dataKey="PL Declarado" fill={PBI_PALETTE[1]} radius={[2, 2, 0, 0]} />
            <Bar yAxisId="right" dataKey="Clientes" fill={PBI_PALETTE[2]} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </PbiCard>

      {/* Row 3: Custódia por Indexador + Custódia por Veículo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <PbiCard title="Custódia por Indexador">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={custodiaPorIndexador} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ strokeWidth: 0.5 }}>
                {custodiaPorIndexador.map((_, i) => (
                  <Cell key={i} fill={PBI_PALETTE[i % PBI_PALETTE.length]} />
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
                  <Cell key={i} fill={PBI_PALETTE[i % PBI_PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
            </PieChart>
          </ResponsiveContainer>
        </PbiCard>
      </div>

      {/* Row 4: Todos os Ativos */}
      <PbiCard title="Todos os Ativos">
        <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
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
                <TableRow key={`${r.doc}-${r.ativo}-${i}`} className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}>
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

      {/* Row 5: Vencimentos bar chart */}
      <PbiCard title="Vencimentos">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={vencimentosData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="ano" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="NET" fill={PBI_PALETTE[0]} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </PbiCard>

      {/* Row 6: ROA Anualizado PF vs PJ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <PbiCard title="ROA Anualizado Ponderado — PF">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={roaData.pf} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fmtPct(v)} />
              <Tooltip formatter={(v: number) => fmtPct(v)} />
              <Bar dataKey="ROA" fill={PBI_PALETTE[0]} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </PbiCard>
        <PbiCard title="ROA Anualizado Ponderado — PJ">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={roaData.pj} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fmtPct(v)} />
              <Tooltip formatter={(v: number) => fmtPct(v)} />
              <Bar dataKey="ROA" fill={PBI_PALETTE[1]} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </PbiCard>
      </div>

      {/* NPS Placeholder */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle className="text-[11px]">NPS</AlertTitle>
        <AlertDescription className="text-[10px]">Base ainda não importada. Importe a base de NPS para visualizar métricas.</AlertDescription>
      </Alert>

      {/* MtM RF Placeholder */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle className="text-[11px]">Mark-to-Market Renda Fixa</AlertTitle>
        <AlertDescription className="text-[10px]">Base ainda não importada. Importe a base de Posição Renda Fixa para visualizar.</AlertDescription>
      </Alert>
    </div>
  );
}
