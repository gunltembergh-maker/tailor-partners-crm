import { useLocation, useNavigate } from "react-router-dom";
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
  LogOut,
  UserCircle,
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
  { title: "Início", icon: Home, path: "/" },
  { title: "Prioridades", icon: Star, path: "/prioridades" },
  { title: "Leads", icon: Target, path: "/leads" },
  { title: "Contas", icon: Users, path: "/clientes" },
  { title: "Tarefas", icon: CheckSquare, path: "/tarefas" },
  { title: "Calendário", icon: CalendarDays, path: "/calendario" },
  { title: "Oportunidades", icon: Briefcase, path: "/oportunidades" },
  { title: "Painéis", icon: BarChart3, path: "/paineis" },
  { title: "Relatórios", icon: FileText, path: "/relatorios" },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="px-6 py-5">
        <div className="cursor-pointer" onClick={() => navigate("/")}>
          <h1 className="text-2xl font-display font-bold text-sidebar-primary tracking-tight">
            Tailor
          </h1>
          <p className="text-[10px] tracking-[0.3em] text-sidebar-foreground/60 uppercase">
            Partners CRM
          </p>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
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
