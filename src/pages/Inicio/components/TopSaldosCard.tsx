import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { C } from "../Inicio";

const fmtAdapt = (n: number | null | undefined): string => {
  if (n == null || !isFinite(n) || n === 0) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000)
    return `R$ ${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n / 1_000_000)} Mi`;
  if (abs >= 1_000)
    return `R$ ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(n / 1_000)} Mil`;
  return `R$ ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(n)}`;
};

interface Props {
  saldos: any[];
  isLoading: boolean;
}

export function TopSaldosCard({ saldos, isLoading }: Props) {
  return (
    <article
      className="rounded-lg p-5 h-full flex flex-col transition-shadow hover:shadow-md"
      style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
    >
      <header className="mb-1">
        <h3 className="font-display" style={{ fontSize: 17, fontWeight: 500, color: C.navy900 }}>
          Top 5 saldos da carteira
        </h3>
        <p style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>Maiores saldos consolidados D0 / D+1 / Total</p>
      </header>

      <div className="mt-3 flex-1">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : saldos.length === 0 ? (
          <p style={{ color: C.textMuted, fontSize: 13 }} className="py-6 text-center">
            Nenhum saldo na sua carteira ainda.
          </p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ color: C.textMuted, borderBottom: `1px solid ${C.border}` }}>
                <th className="text-left font-medium pb-2 pr-2">Cliente</th>
                <th className="text-right font-medium pb-2 px-2">D0</th>
                <th className="text-right font-medium pb-2 px-2">D+1</th>
                <th className="text-right font-medium pb-2 pl-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {saldos.map((s, i) => (
                <tr key={i} style={{ borderBottom: i < saldos.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <td className="py-2 pr-2">
                    <div style={{ color: C.navy900, fontWeight: 500 }} className="truncate max-w-[180px]">
                      {s.cliente_nome ?? "—"}
                    </div>
                    {s.casa && (
                      <div style={{ color: C.textMuted, fontSize: 11 }} className="truncate">
                        {s.casa}
                      </div>
                    )}
                  </td>
                  <td className="text-right py-2 px-2 tabular-nums" style={{ color: C.navy700 }}>
                    {fmtAdapt(s.d0)}
                  </td>
                  <td className="text-right py-2 px-2 tabular-nums" style={{ color: C.navy700 }}>
                    {fmtAdapt(s.d_mais_1)}
                  </td>
                  <td className="text-right py-2 pl-2 tabular-nums" style={{ color: C.navy900, fontWeight: 600 }}>
                    {fmtAdapt(s.total_saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <footer className="mt-3 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
        <Link
          to="/relatorios/saldo-consolidado"
          className="text-xs hover:underline"
          style={{ color: C.navy500 }}
        >
          Ver Saldo Consolidado completo →
        </Link>
      </footer>
    </article>
  );
}
