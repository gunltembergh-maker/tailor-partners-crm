import { Badge } from "@/components/ui/badge";

interface Usuario {
  convite_status?: string | null;
  convite_enviado_em?: string | null;
  convite_aceito_em?: string | null;
  convite_expira_em?: string | null;
}

export function getConviteStatus(usuario: Usuario): string {
  if (
    usuario.convite_status === "enviado" &&
    usuario.convite_expira_em &&
    new Date(usuario.convite_expira_em) < new Date()
  ) {
    return "expirado";
  }
  return usuario.convite_status || "pendente";
}

function formatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

const CONFIG: Record<string, { className: string; icon: string; getLabel: (u: Usuario) => string }> = {
  pendente: {
    className: "bg-muted text-muted-foreground",
    icon: "—",
    getLabel: () => "Não enviado",
  },
  enviado: {
    className: "bg-yellow-500/10 text-yellow-600",
    icon: "⏳",
    getLabel: (u) => `Enviado ${formatShortDate(u.convite_enviado_em)}`,
  },
  expirado: {
    className: "bg-orange-500/10 text-orange-600",
    icon: "🔴",
    getLabel: () => "Expirado",
  },
  aceito: {
    className: "bg-green-500/10 text-green-600",
    icon: "✅",
    getLabel: (u) => `Aceito ${formatShortDate(u.convite_aceito_em)}`,
  },
  cancelado: {
    className: "bg-red-500/10 text-red-600",
    icon: "🚫",
    getLabel: () => "Cancelado",
  },
};

export function ConviteBadge({ usuario }: { usuario: Usuario }) {
  const status = getConviteStatus(usuario);
  const cfg = CONFIG[status] || CONFIG.pendente;

  return (
    <Badge variant="outline" className={`${cfg.className} text-xs`}>
      {cfg.icon} {cfg.getLabel(usuario)}
    </Badge>
  );
}
