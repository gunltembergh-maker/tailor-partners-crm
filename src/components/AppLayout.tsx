import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useViewAs } from "@/contexts/ViewAsContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { roleLabels } from "@/lib/format";
import { Eye, X } from "lucide-react";
import { AdminNotifications } from "@/components/admin/AdminNotifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/LoadingOverlay";

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { viewAsUserId, viewAsProfile, setViewAs, teamMembers, isLider, viewLoading } = useViewAs();
  const firstName = profile?.full_name?.split(" ")[0] || "Usuário";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <LoadingOverlay show={viewLoading} />
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-auto">
          {/* ViewAs Banner */}
          {viewAsProfile && (
            <div className="flex items-center justify-between gap-2 px-4 py-1.5 bg-amber-400 text-amber-950 text-xs font-medium">
              <div className="flex items-center gap-2">
                <Eye className="h-3.5 w-3.5" />
                <span>
                  Visualizando como: <strong>{viewAsProfile.full_name}</strong> ({roleLabels[viewAsProfile.role] || viewAsProfile.role})
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] gap-1 text-amber-950 hover:bg-amber-500 hover:text-amber-950"
                onClick={() => setViewAs(null)}
              >
                <X className="h-3 w-3" />
                Sair da visão
              </Button>
            </div>
          )}

          {/* Topbar */}
          <header className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-3 border-b border-border bg-card/95 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="hidden sm:flex items-baseline gap-1.5">
                <span className="text-lg font-display font-bold text-primary">Hub Tailor</span>
                <span className="text-xs font-medium tracking-widest text-muted-foreground uppercase">Partners</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {isLider && (
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={viewAsUserId || "__self__"}
                    onValueChange={(v) => setViewAs(v === "__self__" ? null : v)}
                  >
                    <SelectTrigger className="w-[220px] h-8 text-xs">
                      <SelectValue placeholder="Ver como..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__self__">Minha visão</SelectItem>
                      {teamMembers.map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.full_name} ({roleLabels[m.role] || m.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <AdminNotifications />
              <span className="text-sm text-muted-foreground">
                Olá, <span className="font-medium text-foreground">{firstName}</span>
              </span>
            </div>
          </header>

          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
