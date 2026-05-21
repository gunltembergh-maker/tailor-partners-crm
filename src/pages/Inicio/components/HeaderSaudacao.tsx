import { RefreshCw } from "lucide-react";
import { C } from "../Inicio";

function getSaudacao() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

function formatDataExtenso(d: Date) {
  const dias = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatHora(d: Date) {
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

interface Props {
  fullName: string;
  lastUpdated: Date;
  isFetching: boolean;
  onRefresh: () => void;
}

export function HeaderSaudacao({ fullName, lastUpdated, isFetching, onRefresh }: Props) {
  const primeiroNome = fullName.split(" ")[0] || "Usuário";
  const now = new Date();

  return (
    <header className="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1
          className="font-display text-[#DFDBBE]"
          style={{ fontSize: 36, fontWeight: 500, lineHeight: 1.1, margin: 0, letterSpacing: "-0.5px" }}
        >
          {getSaudacao()}, {primeiroNome} <span style={{ fontFamily: "Source Sans 3" }}>👋</span>
        </h1>
        <p className="text-[#DFDBBE]/70" style={{ fontSize: 14, marginTop: 6 }}>{formatDataExtenso(now)}</p>
      </div>
      <button
        onClick={onRefresh}
        disabled={isFetching}
        className="flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors bg-white/10 backdrop-blur-sm border border-white/15 text-[#DFDBBE] hover:bg-white/15"
      >
        <span>Atualizado <span className="font-numeric">{formatHora(lastUpdated)}</span></span>
        <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} style={{ transition: "transform 300ms" }} />
      </button>
    </header>
  );
}
