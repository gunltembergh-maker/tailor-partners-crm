import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useViewAs } from "@/contexts/ViewAsContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { roleLabels } from "@/lib/format";
import { Eye } from "lucide-react";
import { AdminNotifications } from "@/components/admin/AdminNotifications";

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { viewAsUserId, setViewAs, teamMembers, isLider } = useViewAs();
  const firstName = profile?.full_name?.split(" ")[0] || "Usuário";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-auto">
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
                    <SelectTrigger className="w-[180px] h-8 text-xs">
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
