import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardFilters } from "@/hooks/useDashboardFilters";
import { useDiversificadorData, useReceitaDetalhadaData } from "@/hooks/useDashboardData";

interface Props {
  filters: DashboardFilters;
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

export function QualitativoTab({ filters }: Props) {
  const { data: diversificador, isLoading: divLoading } = useDiversificadorData(filters);
  const { data: receitaDet, isLoading: recLoading } = useReceitaDetalhadaData(filters);

  // Diversificador: group by produto_ajustado, sum NET
  const divByProduto = useMemo(() => {
    if (!diversificador) return [];
    const map = new Map<string, { net: number; count: number }>();
    diversificador.forEach((r: any) => {
      const k = r.produto_ajustado || "Outros";
      const prev = map.get(k) || { net: 0, count: 0 };
      map.set(k, { net: prev.net + (Number(r.net) || 0), count: prev.count + 1 });
    });
    return [...map.entries()].sort((a, b) => b[1].net - a[1].net).slice(0, 20).map(([produto, v]) => ({
      produto,
      net: v.net,
      posicoes: v.count,
    }));
  }, [diversificador]);

  // Receita: top produtos
  const topProdutos = useMemo(() => {
    if (!receitaDet) return [];
    const map = new Map<string, number>();
    receitaDet.forEach((r: any) => {
      const k = r.produto || "Outros";
      map.set(k, (map.get(k) || 0) + (Number(r.comissao_bruta) || 0));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([produto, receita]) => ({ produto, receita }));
  }, [receitaDet]);

  return (
    <div className="space-y-6">
      {/* Diversificador */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Diversificação — Top Produtos por NET</CardTitle>
        </CardHeader>
        <CardContent>
          {divLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Produto</TableHead>
                    <TableHead className="text-xs text-right">NET Total</TableHead>
                    <TableHead className="text-xs text-right">Posições</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {divByProduto.map((r) => (
                    <TableRow key={r.produto}>
                      <TableCell className="text-xs">{r.produto}</TableCell>
                      <TableCell className="text-xs text-right">{fmtBRL(r.net)}</TableCell>
                      <TableCell className="text-xs text-right">{r.posicoes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receita por produto */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Receita — Top Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          {recLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Produto</TableHead>
                    <TableHead className="text-xs text-right">Receita Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProdutos.map((r) => (
                    <TableRow key={r.produto}>
                      <TableCell className="text-xs">{r.produto}</TableCell>
                      <TableCell className="text-xs text-right">{fmtBRL(r.receita)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* NPS Placeholder */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>NPS</AlertTitle>
        <AlertDescription>Base ainda não importada. Importe a base de NPS para visualizar métricas.</AlertDescription>
      </Alert>

      {/* MtM RF Placeholder */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Mark-to-Market Renda Fixa</AlertTitle>
        <AlertDescription>Base ainda não importada. Importe a base de Posição Renda Fixa para visualizar.</AlertDescription>
      </Alert>
    </div>
  );
}
