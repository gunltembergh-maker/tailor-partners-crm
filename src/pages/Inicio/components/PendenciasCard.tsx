import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { C } from "../Inicio";

interface Pendencia {
  icone: string;
  titulo: string;
  link?: string;
  cta?: string;
}

interface Props {
  role: string | null;
  userId: string | null;
}

export function PendenciasCard({ role, userId }: Props) {
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list: Pendencia[] = [];

      // Tutorial não visto (todos perfis exceto admin)
      if (userId) {
        const onboardingKey = `saldo_consolidado_onboarding_${userId}`;
        if (typeof window !== "undefined" && !localStorage.getItem(onboardingKey)) {
          list.push({
            icone: "🎓",
            titulo: "Tutorial do Saldo Consolidado não foi visto",
            link: "/relatorios/saldo-consolidado",
            cta: "Conhecer",
          });
        }
      }

      // Comunicados ativos (não dispensados — heurística simples)
      try {
        const { data } = await supabase
          .from("admin_popups" as any)
          .select("id, titulo")
          .eq("ativo", true)
          .order("data_inicio", { ascending: false })
          .limit(3);
        if (data) {
          (data as any[]).forEach((p) => {
            const dispKey = `popup_dispensado_${p.id}`;
            if (typeof window === "undefined" || !localStorage.getItem(dispKey)) {
              list.push({
                icone: "📣",
                titulo: p.titulo || "Comunicado",
              });
            }
          });
        }
      } catch {
        /* silent */
      }

      if (!cancelled) {
        setPendencias(list.slice(0, 5));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, role]);

  return (
    <article
      className="rounded-lg p-5 h-full flex flex-col transition-shadow hover:shadow-md"
      style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
    >
      <header className="mb-3">
        <h3 className="font-display" style={{ fontSize: 17, fontWeight: 500, color: C.navy900 }}>
          Atenção {!loading && pendencias.length > 0 && `(${pendencias.length})`}
        </h3>
      </header>

      <div className="flex-1">
        {loading ? (
          <p style={{ color: C.textMuted, fontSize: 13 }}>Carregando…</p>
        ) : pendencias.length === 0 ? (
          <p style={{ color: C.textMuted, fontSize: 13 }} className="py-6 text-center">
            ✨ Tudo em dia! Bom trabalho.
          </p>
        ) : (
          <ul className="space-y-3">
            {pendencias.map((p, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="text-base leading-none mt-0.5">{p.icone}</span>
                <div className="min-w-0">
                  <p style={{ color: C.navy900, fontSize: 13, lineHeight: 1.35 }}>{p.titulo}</p>
                  {p.link && p.cta && (
                    <Link to={p.link} className="text-[11px] hover:underline" style={{ color: C.navy500 }}>
                      {p.cta} →
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
