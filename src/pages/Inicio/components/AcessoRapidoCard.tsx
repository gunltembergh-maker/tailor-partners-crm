import { Link } from "react-router-dom";
import { BarChart3, TrendingUp, Wallet, Upload, UsersRound, Megaphone, ChevronRight, Shield, KeyRound, ClipboardCheck } from "lucide-react";
import { C } from "../Inicio";

const MODULOS = [
  { permissoes: ["menu_dashboards", "menu_dashboards_comercial"], label: "Dashboard Comercial", icon: BarChart3, link: "/dashboards/comercial" },
  { permissoes: ["menu_dashboards", "menu_dashboards_receita"], label: "Dashboard Receita", icon: TrendingUp, link: "/dashboard/receita" },
  { permissoes: ["menu_relatorios"], label: "Saldo Consolidado", icon: Wallet, link: "/relatorios/saldo-consolidado" },
  { permissoes: ["menu_importar_bases", "menu_importar_saldo_xp", "menu_importar_saldo_avenue"], label: "Importar Bases", icon: Upload, link: "/admin/importar-bases" },
  { permissoes: ["menu_auditoria"], label: "Auditoria Comercial", icon: ClipboardCheck, link: "/admin/auditoria-comercial" },
  { permissoes: ["menu_gestao_usuarios"], label: "Gestão de Usuários", icon: UsersRound, link: "/admin/usuarios" },
  { permissoes: ["menu_perfis_acesso"], label: "Perfis de Acesso", icon: Shield, link: "/admin/perfis" },
  { permissoes: ["menu_regras_acesso"], label: "Regras de Acesso", icon: KeyRound, link: "/admin/regras-acesso" },
  { permissoes: ["menu_gestao_usuarios"], label: "Comunicados", icon: Megaphone, link: "/admin/popups" },
];

interface Props {
  permissoes: Record<string, boolean> | null;
  role: string | null;
}

export function AcessoRapidoCard({ permissoes, role }: Props) {
  const isAdmin = role === "ADMIN";
  const canSee = (perms: string[]) => isAdmin || perms.some((p) => permissoes?.[p] === true);

  const liberados = MODULOS.filter((m) => canSee(m.permissoes));
  const seen = new Set<string>();
  const unique = liberados.filter((m) => (seen.has(m.link) ? false : (seen.add(m.link), true)));

  return (
    <article
      className="rounded-lg p-5 h-full transition-shadow hover:shadow-md"
      style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
    >
      <h3 className="font-display mb-4" style={{ fontSize: 17, fontWeight: 500, color: C.navy900 }}>
        Acesso rápido
      </h3>
      <ul className="space-y-1.5">
        {unique.map((m) => (
          <li key={m.link}>
            <Link
              to={m.link}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors group hover:bg-[rgba(75,109,136,0.06)]"
              style={{ color: C.navy900 }}
            >
              <m.icon className="h-4 w-4" style={{ color: C.navy500 }} />
              <span style={{ fontSize: 13.5, fontWeight: 500 }} className="flex-1">
                {m.label}
              </span>
              <ChevronRight
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                style={{ color: C.navy300 }}
              />
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
