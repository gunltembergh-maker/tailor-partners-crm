import { Megaphone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { C } from "../Inicio";

function timeAgo(iso: string | null | undefined) {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.round(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min}min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `há ${hr}h`;
  const dias = Math.round(hr / 24);
  if (dias < 30) return `há ${dias}d`;
  const meses = Math.round(dias / 30);
  return `há ${meses}m`;
}

interface Props {
  mural: any[];
  isLoading: boolean;
}

export function MuralCard({ mural, isLoading }: Props) {
  return (
    <article
      className="rounded-lg p-5 h-full transition-shadow hover:shadow-md"
      style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
    >
      <header className="flex items-center gap-2 mb-4">
        <Megaphone className="h-4 w-4" style={{ color: C.navy500 }} />
        <h3 className="font-display" style={{ fontSize: 17, fontWeight: 500, color: C.navy900 }}>
          Mural Tailor
        </h3>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : mural.length === 0 ? (
        <p style={{ color: C.textMuted, fontSize: 13 }} className="py-8 text-center">
          Nenhum comunicado ou notícia recente.
        </p>
      ) : (
        <ul className="space-y-3">
          {mural.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-3 pb-3"
              style={{ borderBottom: i < mural.length - 1 ? `1px solid ${C.border}` : "none" }}
            >
              <span className="text-lg leading-none mt-0.5">{item.icone || (item.tipo === "noticia" ? "📰" : "📣")}</span>
              <div className="min-w-0 flex-1">
                <p style={{ color: C.navy900, fontSize: 14, fontWeight: 500, lineHeight: 1.3 }} className="truncate">
                  {item.titulo}
                </p>
                {item.conteudo && (
                  <p style={{ color: C.textMuted, fontSize: 12, marginTop: 2, lineHeight: 1.4 }} className="line-clamp-2">
                    {item.conteudo.replace(/<[^>]+>/g, "")}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1.5" style={{ color: C.textMuted, fontSize: 11 }}>
                  <span>{timeAgo(item.publicado_em)}</span>
                  {item.tipo === "noticia" && <span>· InfoMoney</span>}
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline ml-auto"
                      style={{ color: C.navy500 }}
                    >
                      Ler mais →
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
