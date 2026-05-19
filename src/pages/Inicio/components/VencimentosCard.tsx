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

function badgeStyle(dias: number) {
  if (dias <= 7) return { bg: "#FCEBEB", fg: "#791F1F" };
  if (dias <= 30) return { bg: "#FEF6E3", fg: "#7A5300" };
  return { bg: "#E1F5EE", fg: "#0F6E56" };
}

interface Props {
  vencimentos: any[];
  isLoading: boolean;
}

export function VencimentosCard({ vencimentos, isLoading }: Props) {
  return (
    <article
      className="rounded-lg p-5 h-full flex flex-col transition-shadow hover:shadow-md"
      style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
    >
      <header className="mb-1">
        <h3 className="font-display" style={{ fontSize: 17, fontWeight: 500, color: C.navy900 }}>
          Próximos vencimentos
        </h3>
        <p style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>Próximos 60 dias</p>
      </header>

      <div className="mt-3 flex-1">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : vencimentos.length === 0 ? (
          <p style={{ color: C.textMuted, fontSize: 13 }} className="py-6 text-center">
            Nenhum vencimento nos próximos 60 dias ✨
          </p>
        ) : (
          <ul className="space-y-2">
            {vencimentos.map((v, i) => {
              const dias = Number(v.dias_restantes ?? 0);
              const b = badgeStyle(dias);
              return (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 py-2"
                  style={{ borderBottom: i < vencimentos.length - 1 ? `1px solid ${C.border}` : "none" }}
                >
                  <div className="min-w-0">
                    <div style={{ color: C.navy900, fontSize: 13, fontWeight: 500 }} className="truncate">
                      {v.cliente_nome ?? "—"}
                    </div>
                    <div style={{ color: C.textMuted, fontSize: 11 }} className="truncate">
                      {v.ativo ?? "—"}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="tabular-nums" style={{ color: C.navy900, fontSize: 13, fontWeight: 600 }}>
                      {fmtAdapt(v.valor)}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums"
                      style={{ background: b.bg, color: b.fg }}
                    >
                      {dias}d
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </article>
  );
}
