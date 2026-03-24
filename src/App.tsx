import { Toaster } from "@/components/ui/toaster";
import TailorLoader from "@/components/TailorLoader";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ViewAsProvider } from "@/contexts/ViewAsContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import LeadDetalhe from "./pages/LeadDetalhe";
import Clientes from "./pages/Clientes";
import ClienteDetalhe from "./pages/ClienteDetalhe";
import Oportunidades from "./pages/Oportunidades";
import OportunidadeDetalhe from "./pages/OportunidadeDetalhe";
import Tarefas from "./pages/Tarefas";
import Prioridades from "./pages/Prioridades";
import Calendario from "./pages/Calendario";
import Paineis from "./pages/Paineis";
import Relatorios from "./pages/Relatorios";
import DashComercial from "./pages/DashComercial";
import DashboardComercial from "./pages/DashboardComercial";
import AuditoriaComercial from "./pages/AuditoriaComercial";
import NotFound from "./pages/NotFound";
import ImportClients from "./pages/ImportClients";
import ImportarBases from "./pages/ImportarBases";


const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) {
    return <TailorLoader />;
  }
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { session, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      <Route path="/auth" element={session ? <Navigate to="/" replace /> : <Auth />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
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
      <Route path="/import-clients" element={<ProtectedRoute><ImportClients /></ProtectedRoute>} />
      <Route path="/admin/importar-bases" element={<ProtectedRoute><ImportarBases /></ProtectedRoute>} />
      <Route path="/admin/auditoria-comercial" element={<ProtectedRoute><AuditoriaComercial /></ProtectedRoute>} />
      <Route path="/admin/perfis" element={<ProtectedRoute><GestaoProfiles /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
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
