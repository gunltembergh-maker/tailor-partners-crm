import { SectionTitle } from "../Inicio";
import { TopSaldosCard } from "./TopSaldosCard";
import { VencimentosCard } from "./VencimentosCard";
import { PendenciasCard } from "./PendenciasCard";

interface Props {
  topSaldos: any[];
  vencimentos: any[];
  isLoading: boolean;
  role: string | null;
  userId: string | null;
}

export function LembretesInteligentes({ topSaldos, vencimentos, isLoading, role, userId }: Props) {
  return (
    <section className="space-y-4">
      <SectionTitle>Lembretes para hoje</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5">
          <TopSaldosCard saldos={topSaldos} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-4">
          <VencimentosCard vencimentos={vencimentos} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-3">
          <PendenciasCard role={role} userId={userId} />
        </div>
      </div>
    </section>
  );
}
