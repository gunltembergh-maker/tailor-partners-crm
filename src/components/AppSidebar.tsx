import { useLocation, useNavigate } from "react-router-dom";
import { LOGO_DARK_BG } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { useViewAs } from "@/contexts/ViewAsContext";
import { roleLabels } from "@/lib/format";
import {
  Home,
  Star,
  Target,
  Users,
  CheckSquare,
  CalendarDays,
  Briefcase,
  BarChart3,
  FileText,
  Upload,
  ClipboardCheck,
  Shield,
  LogOut,
  UserCircle,
  UsersRound,
  KeyRound,
  Megaphone,
  Mail,
  Wallet,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Início", icon: Home, path: "/inicio", key: "menu_inicio" },
  { title: "Prioridades", icon: Star, path: "/prioridades", key: "menu_prioridades" },
  { title: "Leads", icon: Target, path: "/leads", key: "menu_leads" },
  { title: "Contas", icon: Users, path: "/clientes", key: "menu_contas" },
  { title: "Tarefas", icon: CheckSquare, path: "/tarefas", key: "menu_tarefas" },
  { title: "Calendário", icon: CalendarDays, path: "/calendario", key: "menu_calendario" },
  { title: "Oportunidades", icon: Briefcase, path: "/oportunidades", key: "menu_oportunidades" },
  { title: "Painéis", icon: BarChart3, path: "/paineis", key: "menu_paineis" },
  { title: "Relatórios", icon: FileText, path: "/relatorios", key: "menu_relatorios" },
  { title: "Saldo Consolidado", icon: Wallet, path: "/relatorios/saldo-consolidado", key: "menu_relatorios", indent: true },
];

// Padrão de granularização pai/filho (igual ao Importar Bases).
// Adicionar nova permissão = atualizar esta lista + PermissionRoute em App.tsx +
// GestaoProfiles.tsx + jsonb_build_object da migration de backfill.
const DASHBOARDS_PERMISSIONS = [
  "menu_dashboards",
  "menu_dashboards_comercial",
  "menu_dashboards_receita",
];

const dashboardItems = [
  { title: "Comercial", icon: BarChart3, path: "/dashboards/comercial", keys: ["menu_dashboards_comercial", "menu_dashboards"] },
  { title: "Receita", icon: BarChart3, path: "/dashboard/receita", keys: ["menu_dashboards_receita", "menu_dashboards"] },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { effectiveRole, effectivePermissoes } = useViewAs();
  const { setOpen, setOpenMobile, isMobile } = useSidebar();
  const navigateAndClose = (path: string) => {
    // Persistimos ANTES de navegar porque cada página remonta seu próprio
    // AppLayout — sem isso, o useEffect de persistência não chega a rodar
    // antes do unmount e o sidebar reabre na próxima rota.
    if (isMobile) {
      setOpenMobile(false);
    } else {
      try { localStorage.setItem("hub_sidebar_open", "false"); } catch {}
      setOpen(false);
    }
    navigate(path);
  };

  // Visibility ALWAYS reflects the simulated profile when Minha Visão is active.
  // Only ADMIN has auto-grant. LIDER (and all other roles) must respect the
  // permissions configured in /admin/perfis — that page is the source of truth.
  const role = effectiveRole;
  const permissoes = effectivePermissoes;
  const isAdmin = role === "ADMIN";

  const canSee = (key: string) => isAdmin || permissoes?.[key] === true;

  // Filter menu items based on permissions
  const visibleMenuItems = menuItems.filter((item) => canSee(item.key));
  const visibleDashboardItems = dashboardItems.filter((item) => item.keys.some(canSee));
  const showMainMenu = visibleMenuItems.length > 0;

  // Lista de permissões relacionadas a "Importar Bases" (pai + filhos).
  // Adicionar futuras sub-permissões de importação aqui.
  const IMPORT_PERMISSIONS = [
    "menu_importar_bases",
    "menu_importar_saldo_xp",
    "menu_importar_saldo_avenue",
  ];
  const canSeeImportarBases = () => IMPORT_PERMISSIONS.some((p) => canSee(p));

  // Build admin items based on permissions
  const adminItems: { title: string; icon: any; path: string }[] = [];
  if (canSeeImportarBases()) {
    adminItems.push({ title: "Importar Bases", icon: Upload, path: "/admin/importar-bases" });
  }
  if (canSee("menu_auditoria")) {
    adminItems.push({ title: "Auditoria Comercial", icon: ClipboardCheck, path: "/admin/auditoria-comercial" });
  }
  if (canSee("menu_gestao_usuarios")) {
    adminItems.push({ title: "Usuários", icon: UsersRound, path: "/admin/usuarios" });
  }
  if (canSee("menu_perfis_acesso")) {
    adminItems.push({ title: "Perfis de Acesso", icon: Shield, path: "/admin/perfis" });
  }
  if (canSee("menu_regras_acesso")) {
    adminItems.push({ title: "Regras de Acesso", icon: KeyRound, path: "/admin/regras-acesso" });
  }
  if (canSee("menu_gestao_usuarios")) {
    adminItems.push({ title: "Comunicados", icon: Megaphone, path: "/admin/popups" });
  }
  if (isAdmin) {
    adminItems.push({ title: "Log de Emails", icon: Mail, path: "/admin/emails/log" });
  }
  if (isAdmin || canSee("gerenciar_emails_schedules")) {
    adminItems.push({ title: "Agendamentos de E-mail", icon: CalendarDays, path: "/admin/emails/schedules" });
  }
  if (isAdmin || canSee("gerenciar_configuracoes_hub")) {
    adminItems.push({ title: "Configurações", icon: Settings, path: "/admin/configuracoes" });
  }

  const showAdmin = adminItems.length > 0;

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-6">
        <div className="flex items-center justify-center cursor-pointer" onClick={() => navigate("/inicio")}>
          <img src="/tailor-logo-bege.svg" alt="Tailor Partners" className="h-10 w-auto" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {showMainMenu && (
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={location.pathname === item.path}
                    onClick={() => navigateAndClose(item.path)}
                    tooltip={item.title}
                    className={(item as any).indent ? "pl-8 text-[13px]" : ""}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}

        {visibleDashboardItems.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
            Dashboards
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleDashboardItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={location.pathname === item.path}
                    onClick={() => navigateAndClose(item.path)}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}

        {showAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={location.pathname === item.path}
                      onClick={() => navigateAndClose(item.path)}
                      tooltip={item.title}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 mb-3">
          <UserCircle className="h-8 w-8 text-sidebar-foreground/60 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.full_name || "Usuário"}
            </p>
            <p className="text-xs text-sidebar-foreground/50 truncate">
              {role ? roleLabels[role] || role : ""}
            </p>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
