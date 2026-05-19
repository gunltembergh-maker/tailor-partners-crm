import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { PopupCard } from "@/components/PopupComunicado";
import { C } from "../Inicio";

interface Comunicado {
  id: string;
  titulo: string;
  mensagem: string;
  cor_fundo: string;
  cor_texto: string;
  botao_label: string;
  logo_url: string | null;
  mostrar_nome_hub: boolean;
  data_inicio: string | null;
}

interface Props {
  role?: string | null;
  userId?: string | null;
}

export function PendenciasCard(_props: Props) {
  const [aberto, setAberto] = useState<Comunicado | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["inicio-comunicados"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_inicio_comunicados_ativos" as any);
      if (error) {
        console.warn("[Comunicados] erro:", error.message);
        return [] as Comunicado[];
      }
      return ((data as unknown) as Comunicado[]) ?? [];
    },
    staleTime: 60_000,
  });

  const comunicados = data ?? [];

  const handleDismiss = async () => {
    if (aberto) {
      try {
        await supabase.rpc("rpc_dispensar_popup" as any, { p_popup_id: aberto.id } as any);
      } catch {}
    }
    setAberto(null);
  };

  return (
    <>
      <article
        className="rounded-lg p-5 h-full flex flex-col transition-shadow hover:shadow-md"
        style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
      >
        <header className="mb-3">
          <h3 className="font-display" style={{ fontSize: 17, fontWeight: 500, color: C.navy900 }}>
            Comunicados {comunicados.length > 0 && `(${comunicados.length})`}
          </h3>
        </header>

        <div className="flex-1">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : comunicados.length === 0 ? (
            <p style={{ color: C.textMuted, fontSize: 13 }} className="py-6 text-center">
              ✨ Nenhum comunicado ativo no momento
            </p>
          ) : (
            <ul className="space-y-2">
              {comunicados.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setAberto(c)}
                    className="w-full text-left flex items-start justify-between gap-2 rounded-md p-2 -mx-2 transition-colors hover:bg-black/[0.03] group"
                  >
                    <div className="min-w-0">
                      <p
                        className="line-clamp-2"
                        style={{ color: C.navy900, fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}
                      >
                        {c.titulo}
                      </p>
                    </div>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 mt-0.5 opacity-50 group-hover:opacity-100 transition-opacity"
                      style={{ color: C.navy500 }}
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </article>

      {aberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setAberto(null)}
          />
          <div className="relative">
            <PopupCard
              titulo={aberto.titulo}
              mensagem={aberto.mensagem}
              logo_url={aberto.logo_url}
              mostrar_nome_hub={aberto.mostrar_nome_hub}
              onDismissPermanent={handleDismiss}
              onDismissTemporary={() => setAberto(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}
