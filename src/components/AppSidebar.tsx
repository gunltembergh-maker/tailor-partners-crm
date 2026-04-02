import { useLocation, useNavigate } from "react-router-dom";
import { LOGO_DARK_BG } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
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
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Início", icon: Home, path: "/", key: "menu_inicio" },
  { title: "Prioridades", icon: Star, path: "/prioridades", key: "menu_prioridades" },
  { title: "Leads", icon: Target, path: "/leads", key: "menu_leads" },
  { title: "Contas", icon: Users, path: "/clientes", key: "menu_contas" },
  { title: "Tarefas", icon: CheckSquare, path: "/tarefas", key: "menu_tarefas" },
  { title: "Calendário", icon: CalendarDays, path: "/calendario", key: "menu_calendario" },
  { title: "Oportunidades", icon: Briefcase, path: "/oportunidades", key: "menu_oportunidades" },
  { title: "Painéis", icon: BarChart3, path: "/paineis", key: "menu_paineis" },
  { title: "Relatórios", icon: FileText, path: "/relatorios", key: "menu_relatorios" },
];

const dashboardItems = [
  { title: "Comercial", icon: BarChart3, path: "/dashboards/comercial", key: "menu_dashboard_comercial" },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role, permissoes, signOut } = useAuth();

  const isAdmin = role === "ADMIN";

  const canSee = (key: string) => isAdmin || permissoes?.[key] === true;

  // Filter menu items based on permissions
  const visibleMenuItems = menuItems.filter((item) => canSee(item.key));
  const visibleDashboardItems = dashboardItems.filter((item) => canSee(item.key));
  const showMainMenu = visibleMenuItems.length > 0;

  // Build admin items based on permissions
  const adminItems: { title: string; icon: any; path: string }[] = [];
  if (canSee("menu_importar_bases")) {
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

  const showAdmin = adminItems.length > 0;

  return (
    <Sidebar>
      <SidebarHeader className="px-6 py-5">
        <div className="cursor-pointer" onClick={() => navigate("/")}>
          <img src={LOGO_DARK_BG} alt="Tailor Partners" className="w-[130px]" />
          <p className="text-[10px] tracking-[0.2em] text-sidebar-foreground/50 mt-1">
            Hub - Grupo Tailor Partners
          </p>
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
                    onClick={() => navigate(item.path)}
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
                    onClick={() => navigate(item.path)}
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
                      onClick={() => navigate(item.path)}
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
