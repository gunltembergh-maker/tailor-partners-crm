import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useViewAs } from "@/contexts/ViewAsContext";
import { useInicioData } from "./hooks/useInicioData";
import { HeaderSaudacao } from "./components/HeaderSaudacao";
import { LembretesInteligentes } from "./components/LembretesInteligentes";
import { KPIsCards } from "./components/KPIsCards";
import { MuralCard } from "./components/MuralCard";
import { AcessoRapidoCard } from "./components/AcessoRapidoCard";
import { UltimasAtualizacoesCard } from "./components/UltimasAtualizacoesCard";
import { PopupComunicado } from "@/components/PopupComunicado";

export const C = {
  navy900: "#0A2337",
  navy700: "#1A3A52",
  navy500: "#4B6D88",
  navy300: "#73A7B7",
  navy100: "#D4E1E6",
  bgPage: "#F4F2EC",
  bgCard: "#FFFFFF",
  textMuted: "#5F7A8E",
  border: "rgba(75,109,136,0.12)",
};

export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2
    className="font-display flex items-center gap-2.5 text-[#DFDBBE]"
    style={{ fontSize: 20, fontWeight: 500, margin: 0, letterSpacing: "-0.2px" }}
  >
    <span
      aria-hidden
      style={{
        width: 0,
        height: 0,
        borderTop: "5px solid transparent",
        borderBottom: "5px solid transparent",
        borderLeft: `8px solid #73A7B7`,
        flexShrink: 0,
      }}
    />
    {children}
  </h2>
);

export default function Inicio() {
  const { user, profile } = useAuth();
  const { effectiveRole, effectivePermissoes } = useViewAs();
  const { data, isLoading, refetch, isFetching, lastUpdated } = useInicioData();

  return (
    <AppLayout>
      <div className="relative min-h-full -m-6">
        <div className="absolute inset-0 -z-10" style={{ backgroundColor: "#082537" }} />
        <img
          src="/tailor-chevrons.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 select-none opacity-90 -z-10"
          style={{
            width: 'min(45vw, 567px)',
            height: 'auto',
            maxHeight: '80vh',
          }}
        />
        <div className="relative z-0 p-6 md:p-8 lg:p-12">
          <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500">
            <HeaderSaudacao
              fullName={profile?.full_name || "Usuário"}
              lastUpdated={lastUpdated}
              isFetching={isFetching}
              onRefresh={refetch}
            />

            <LembretesInteligentes
              topSaldos={data.topSaldos}
              vencimentos={data.vencimentos}
              isLoading={isLoading}
              role={effectiveRole}
              userId={user?.id ?? null}
            />

            <KPIsCards role={effectiveRole} />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              <div className="lg:col-span-3">
                <MuralCard mural={data.mural} isLoading={isLoading} />
              </div>
              <div className="lg:col-span-2">
                <AcessoRapidoCard permissoes={effectivePermissoes} role={effectiveRole} />
              </div>
            </div>

            <UltimasAtualizacoesCard timestamps={data.timestamps} isLoading={isLoading} />
          </div>
        </div>
      </div>
      <PopupComunicado />
    </AppLayout>
  );
}
