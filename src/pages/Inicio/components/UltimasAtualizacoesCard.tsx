import { Skeleton } from "@/components/ui/skeleton";
import { C, SectionTitle } from "../Inicio";

function ageColor(iso: string | null | undefined): string {
  if (!iso) return C.textMuted;
  const diffHr = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (diffHr < 24) return "#0F6E56";
  if (diffHr < 72) return "#B07700";
  return "#9C2B2B";
}

function formatRelative(iso: string | null | undefined) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const hr = Math.round(diff / 3_600_000);
  if (hr < 1) return "há poucos minutos";
  if (hr < 24) return `há ${hr}h`;
  const dias = Math.round(hr / 24);
  return `há ${dias}d`;
}

interface Props {
  timestamps: any[];
  isLoading: boolean;
}

export function UltimasAtualizacoesCard({ timestamps, isLoading }: Props) {
  // rpc_dashboard_timestamps returns a single row with multiple timestamp fields
  const row = Array.isArray(timestamps) ? timestamps[0] : timestamps;

  const bases = row
    ? [
        { label: "Dados consolidados", iso: row.dados_ate || row.atualizado_em },
        { label: "Última atualização", iso: row.atualizado_em },
      ].filter((b) => b.iso)
    : [];

  return (
    <section className="space-y-3">
      <SectionTitle>Últimas atualizações de dados</SectionTitle>
      <article
        className="rounded-lg p-5"
        style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
      >
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : bases.length === 0 ? (
          <p style={{ color: C.textMuted, fontSize: 13 }} className="text-center py-4">
            Sem informações de atualização disponíveis.
          </p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {bases.map((b, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span style={{ color: C.navy900, fontSize: 13 }}>{b.label}</span>
                <span className="flex items-center gap-1.5 text-[12px] font-numeric" style={{ color: ageColor(b.iso) }}>
                  {formatRelative(b.iso)}
                  <span style={{ color: ageColor(b.iso) }}>●</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
