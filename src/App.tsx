import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import TailorLoader from "@/components/TailorLoader";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ViewAsProvider } from "@/contexts/ViewAsContext";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import Auth from "./pages/Auth";
import { BlockedUserScreen } from "@/components/admin/BlockedUserScreen";

// Lazy-loaded pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
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
const DashComercial = lazy(() => import("./pages/DashComercial"));
const DashboardComercial = lazy(() => import("./pages/DashboardComercial"));
const AuditoriaComercial = lazy(() => import("./pages/AuditoriaComercial"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ImportClients = lazy(() => import("./pages/ImportClients"));
const ImportarBases = lazy(() => import("./pages/ImportarBases"));
const GestaoProfiles = lazy(() => import("./pages/admin/GestaoProfiles"));
const GestaoUsuarios = lazy(() => import("./pages/admin/GestaoUsuarios"));
const RegrasAcesso = lazy(() => import("./pages/admin/RegrasAcesso"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, isBlocked } = useAuth();
  if (loading) return <TailorLoader />;
  if (!session) return <Navigate to="/auth" replace />;
  if (isBlocked) return <BlockedUserScreen />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { session, role, loading } = useAuth();
  if (loading) return <TailorLoader />;
  if (!session) return <Navigate to="/auth" replace />;
  if (!role || !["ADMIN", "LIDER"].includes(role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { session, loading } = useAuth();
  if (loading) return null;

  return (
    <Suspense fallback={<LoadingOverlay show />}>
      <Routes>
        <Route path="/auth" element={session ? <Navigate to="/dashboards/comercial" replace /> : <Auth />} />
        <Route path="/" element={<ProtectedRoute><Navigate to="/dashboards/comercial" replace /></ProtectedRoute>} />
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
        <Route path="/dashboards/comercial" element={<ProtectedRoute><DashboardComercial /></ProtectedRoute>} />
        <Route path="/relatorios/dash-comercial" element={<ProtectedRoute><DashComercial /></ProtectedRoute>} />
        <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
        <Route path="/import-clients" element={<AdminRoute><ImportClients /></AdminRoute>} />
        <Route path="/admin/importar-bases" element={<AdminRoute><ImportarBases /></AdminRoute>} />
        <Route path="/admin/auditoria-comercial" element={<AdminRoute><AuditoriaComercial /></AdminRoute>} />
        <Route path="/admin/perfis" element={<AdminRoute><GestaoProfiles /></AdminRoute>} />
        <Route path="/admin/usuarios" element={<AdminRoute><GestaoUsuarios /></AdminRoute>} />
        <Route path="/admin/regras-acesso" element={<AdminRoute><RegrasAcesso /></AdminRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ViewAsProvider>
            <AppRoutes />
          </ViewAsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
