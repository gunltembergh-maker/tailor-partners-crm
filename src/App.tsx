import { Suspense, lazy, Component, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import TailorLoader from "@/components/TailorLoader";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ViewAsProvider, useViewAs } from "@/contexts/ViewAsContext";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { MinhaVisaoIndicator } from "@/components/MinhaVisaoIndicator";
import Auth from "./pages/Auth";
import { BlockedUserScreen } from "@/components/admin/BlockedUserScreen";

// Error Boundary to prevent white screens from unhandled errors
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("App Error Boundary:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white gap-4">
          <p className="text-sm font-medium text-gray-600">Algo deu errado. Tente recarregar a página.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm rounded-md bg-[#1B2A3D] text-white hover:opacity-90"
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy-loaded pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Inicio = lazy(() => import("./pages/Inicio/Inicio"));
const Leads = lazy(() => import("./pages/Leads"));
const LeadDetalhe = lazy(() => import("./pages/LeadDetalhe"));
const Clientes = lazy(() => import("./pages/Clientes"));
const ClienteDetalhe = lazy(() => import("./pages/ClienteDetalhe"));
const Oportunidades = lazy(() => import("./pages/Oportunidades"));
const OportunidadeDetalhe = lazy(() => import("./pages/OportunidadeDetalhe"));
const Tarefas = lazy(() => import("./pages/Tarefas"));
const Prioridades = lazy(() => import("./pages/Prioridades"));
const Calendario = lazy(() => import("./pages/Calendario"));
const Paineis = lazy(() => import("./pages/Paineis"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const SaldoConsolidado = lazy(() => import("./pages/SaldoConsolidado"));
const DashComercial = lazy(() => import("./pages/DashComercial"));
const DashboardComercial = lazy(() => import("./pages/DashboardComercial"));
const ReceitaCaixa = lazy(() => import("./pages/dashboard/ReceitaCaixa"));
const AuditoriaComercial = lazy(() => import("./pages/AuditoriaComercial"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ImportClients = lazy(() => import("./pages/ImportClients"));
const ImportarBases = lazy(() => import("./pages/ImportarBases"));
const GestaoProfiles = lazy(() => import("./pages/admin/GestaoProfiles"));
const GestaoUsuarios = lazy(() => import("./pages/admin/GestaoUsuarios"));
const RegrasAcesso = lazy(() => import("./pages/admin/RegrasAcesso"));
const GerenciarPopups = lazy(() => import("./pages/admin/GerenciarPopups"));
const EmailsLog = lazy(() => import("./pages/admin/EmailsLog"));
const EmailSchedules = lazy(() => import("./pages/admin/EmailSchedules"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const AtivarConta = lazy(() => import("./pages/auth/AtivarConta"));
const TesteEmValidacao = lazy(() => import("./pages/TesteEmValidacao"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

function resolveLandingPath(role: string | null, permissoes: Record<string, boolean> | null) {
  if (role === "ADMIN" || role === "LIDER") return "/inicio";

  const candidates = [
    "/inicio",
    "/prioridades",
    "/leads",
    "/clientes",
    "/tarefas",
    "/calendario",
    "/oportunidades",
    "/paineis",
    "/relatorios",
    "/dashboards/comercial",
    "/dashboard/receita",
    "/admin/importar-bases",
    "/admin/emails/schedules",
  ] as const;

  const routePermissions: Record<(typeof candidates)[number], string[]> = {
    "/inicio": ["menu_inicio"],
    "/prioridades": ["menu_prioridades"],
    "/leads": ["menu_leads"],
    "/clientes": ["menu_contas"],
    "/tarefas": ["menu_tarefas"],
    "/calendario": ["menu_calendario"],
    "/oportunidades": ["menu_oportunidades"],
    "/paineis": ["menu_paineis"],
    "/relatorios": ["menu_relatorios"],
    "/dashboards/comercial": ["menu_dashboards", "menu_dashboards_comercial"],
    "/dashboard/receita": ["menu_dashboards", "menu_dashboards_receita"],
    "/admin/importar-bases": ["menu_importar_bases", "menu_importar_saldo_xp", "menu_importar_saldo_avenue"],
    "/admin/emails/schedules": ["gerenciar_emails_schedules"],
  };

  const allowed = candidates.find((path) => routePermissions[path].some((permission) => !!permissoes?.[permission]));
  return allowed ?? null;
}

function AccessDeniedScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <p className="text-base font-medium text-foreground">Seu acesso foi autenticado, mas nenhuma tela foi liberada para este perfil.</p>
      <p className="text-sm text-muted-foreground">Peça ao administrador para revisar suas permissões.</p>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, isBlocked } = useAuth();
  const location = useLocation();
  if (loading) return <TailorLoader />;
  if (!session) return <Navigate to="/auth" replace state={{ from: location.pathname + location.search }} />;
  if (isBlocked) return <BlockedUserScreen />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const { effectiveRole } = useViewAs();
  if (loading) return <TailorLoader />;
  if (!session) return <Navigate to="/auth" replace />;
  if (!effectiveRole || !["ADMIN", "LIDER"].includes(effectiveRole)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// Permite ADMIN/LIDER OU qualquer usuário cujo perfil tenha PELO MENOS UMA das permissões indicadas (lógica OR).
// Usa effectiveRole/effectivePermissoes para que a Minha Visão simule corretamente o acesso do perfil alvo.
function PermissionRoute({ permissions, children }: { permissions: string[]; children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const { effectiveRole, effectivePermissoes } = useViewAs();
  if (loading) return <TailorLoader />;
  if (!session) return <Navigate to="/auth" replace />;
  // Defesa em profundidade: session ativa mas perfil ainda não consolidou → manter Loader
  // (evita falso AccessDenied por race condition no useAuth)
  if (effectiveRole === null && (effectivePermissoes === null || Object.keys(effectivePermissoes).length === 0)) {
    return <TailorLoader />;
  }
  const isAdminLider = effectiveRole === "ADMIN" || effectiveRole === "LIDER";
  const hasAnyPerm = permissions.some((p) => !!effectivePermissoes?.[p]);
  if (!isAdminLider && !hasAnyPerm) {
    const fallbackPath = resolveLandingPath(effectiveRole, effectivePermissoes);
    return fallbackPath ? <Navigate to={fallbackPath} replace /> : <AccessDeniedScreen />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { session, loading, role, permissoes } = useAuth();
  if (loading) return <TailorLoader />;

  // Defesa em profundidade: session ativa mas perfil ainda não consolidou → Loader
  const profilePending = !!session && role === null && (permissoes === null || Object.keys(permissoes).length === 0);
  if (profilePending) return <TailorLoader />;

  const landingPath = resolveLandingPath(role, permissoes);

  return (
    <Suspense fallback={<LoadingOverlay show />}>
      <Routes>
        <Route path="/auth" element={session ? (landingPath ? <Navigate to={landingPath} replace /> : <AccessDeniedScreen />) : <Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/ativar-conta" element={<AtivarConta />} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />
        <Route path="/" element={<ProtectedRoute>{landingPath ? <Navigate to={landingPath} replace /> : <AccessDeniedScreen />}</ProtectedRoute>} />
        <Route path="/inicio" element={<PermissionRoute permissions={["menu_inicio"]}><Inicio /></PermissionRoute>} />
        <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
        <Route path="/leads/:id" element={<ProtectedRoute><LeadDetalhe /></ProtectedRoute>} />
        <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
        <Route path="/clientes/:id" element={<ProtectedRoute><ClienteDetalhe /></ProtectedRoute>} />
        <Route path="/oportunidades" element={<ProtectedRoute><Oportunidades /></ProtectedRoute>} />
        <Route path="/oportunidades/:id" element={<ProtectedRoute><OportunidadeDetalhe /></ProtectedRoute>} />
        <Route path="/tarefas" element={<ProtectedRoute><Tarefas /></ProtectedRoute>} />
        <Route path="/prioridades" element={<ProtectedRoute><Prioridades /></ProtectedRoute>} />
        <Route path="/calendario" element={<ProtectedRoute><Calendario /></ProtectedRoute>} />
        <Route path="/paineis" element={<ProtectedRoute><Paineis /></ProtectedRoute>} />
        <Route path="/dashboards/comercial" element={<PermissionRoute permissions={["menu_dashboards", "menu_dashboards_comercial"]}><DashboardComercial /></PermissionRoute>} />
        <Route path="/dashboard/receita" element={<PermissionRoute permissions={["menu_dashboards", "menu_dashboards_receita"]}><ReceitaCaixa /></PermissionRoute>} />
        <Route path="/relatorios/dash-comercial" element={<ProtectedRoute><DashComercial /></ProtectedRoute>} />
        <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
        <Route path="/relatorios/saldo-consolidado" element={<ProtectedRoute><SaldoConsolidado /></ProtectedRoute>} />
        <Route path="/import-clients" element={<AdminRoute><ImportClients /></AdminRoute>} />
        <Route path="/admin/importar-bases" element={<PermissionRoute permissions={["menu_importar_bases", "menu_importar_saldo_xp", "menu_importar_saldo_avenue"]}><ImportarBases /></PermissionRoute>} />
        <Route path="/admin/auditoria-comercial" element={<AdminRoute><AuditoriaComercial /></AdminRoute>} />
        <Route path="/admin/perfis" element={<AdminRoute><GestaoProfiles /></AdminRoute>} />
        <Route path="/admin/usuarios" element={<AdminRoute><GestaoUsuarios /></AdminRoute>} />
        <Route path="/admin/regras-acesso" element={<AdminRoute><RegrasAcesso /></AdminRoute>} />
        <Route path="/admin/popups" element={<AdminRoute><GerenciarPopups /></AdminRoute>} />
        <Route path="/admin/emails/log" element={<AdminRoute><EmailsLog /></AdminRoute>} />
        <Route path="/admin/emails/schedules" element={<PermissionRoute permissions={["gerenciar_emails_schedules"]}><EmailSchedules /></PermissionRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ViewAsProvider>
              <AppRoutes />
              <MinhaVisaoIndicator />
            </ViewAsProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
