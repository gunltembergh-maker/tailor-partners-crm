import { useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardFilters } from "@/hooks/useDashboardFilters";
import { useDiversificadorData, useReceitaDetalhadaData } from "@/hooks/useDashboardData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  filters: DashboardFilters;
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
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

export function QualitativoTab({ filters }: Props) {
  const { data: diversificador, isLoading: divLoading } = useDiversificadorData(filters);
  const { data: receitaDet, isLoading: recLoading } = useReceitaDetalhadaData(filters);

  // Top 10 Produtos por NET
  const topProdutosNet = useMemo(() => {
    if (!diversificador) return [];
    const map = new Map<string, { net: number; count: number }>();
    diversificador.forEach((r: any) => {
      const k = r.produto_ajustado || "Outros";
      const prev = map.get(k) || { net: 0, count: 0 };
      map.set(k, { net: prev.net + (Number(r.net) || 0), count: prev.count + 1 });
    });
    return [...map.entries()].sort((a, b) => b[1].net - a[1].net).slice(0, 10).map(([produto, v]) => ({
      produto,
      net: v.net,
      posicoes: v.count,
    }));
  }, [diversificador]);

  // Top 10 Produtos por Receita
  const topProdutosReceita = useMemo(() => {
    if (!receitaDet) return [];
    const map = new Map<string, number>();
    receitaDet.forEach((r: any) => {
      const k = r.produto || "Outros";
      map.set(k, (map.get(k) || 0) + (Number(r.comissao_bruta) || 0));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([produto, receita]) => ({ produto, receita }));
  }, [receitaDet]);

  const loading = divLoading || recLoading;

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Top Produtos NET — Chart + Table side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <PbiCard title="Top 10 Produtos — NET">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topProdutosNet} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
              <YAxis type="category" dataKey="produto" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={75} />
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
              <Bar dataKey="net" fill="hsl(var(--accent))" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </PbiCard>
        <PbiCard title="Detalhamento — Diversificação">
          <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-[10px] py-1">Produto</TableHead>
                  <TableHead className="text-[10px] py-1 text-right">NET Total</TableHead>
                  <TableHead className="text-[10px] py-1 text-right">Posições</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProdutosNet.map((r, i) => (
                  <TableRow key={r.produto} className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                    <TableCell className="text-[10px] py-1">{r.produto}</TableCell>
                    <TableCell className="text-[10px] py-1 text-right">{fmtBRL(r.net)}</TableCell>
                    <TableCell className="text-[10px] py-1 text-right">{r.posicoes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </PbiCard>
      </div>

      {/* Top Produtos Receita — Chart + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <PbiCard title="Top 10 Produtos — Receita">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topProdutosReceita} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fmtBRL(v)} />
              <YAxis type="category" dataKey="produto" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={75} />
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
              <Bar dataKey="receita" fill="hsl(var(--tailor-copper))" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </PbiCard>
        <PbiCard title="Detalhamento — Receita por Produto">
          <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-[10px] py-1">Produto</TableHead>
                  <TableHead className="text-[10px] py-1 text-right">Receita Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProdutosReceita.map((r, i) => (
                  <TableRow key={r.produto} className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                    <TableCell className="text-[10px] py-1">{r.produto}</TableCell>
                    <TableCell className="text-[10px] py-1 text-right">{fmtBRL(r.receita)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
