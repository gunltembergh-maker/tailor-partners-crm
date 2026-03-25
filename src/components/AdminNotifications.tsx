import { useState } from "react";
import { Bell, AlertTriangle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";

const ROLES = ["ASSESSOR", "BANKER", "LIDER", "FINDER", "ADMIN"];

function formatBRT(isoString: string): string {
  const d = new Date(isoString);
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  const dd = brt.getUTCDate().toString().padStart(2, "0");
  const mm = (brt.getUTCMonth() + 1).toString().padStart(2, "0");
  const hh = brt.getUTCHours().toString().padStart(2, "0");
  const min = brt.getUTCMinutes().toString().padStart(2, "0");
  return `${dd}/${mm} ${hh}:${min}`;
}

export function AdminNotifications() {
  const { unreadNotifications, unreadCount, isAdmin, dismiss, approve } = useAdminNotifications();
  const [approveTarget, setApproveTarget] = useState<{ userId: string; notifId: string; nome: string } | null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  if (!isAdmin) return null;

  const handleApprove = async () => {
    if (!approveTarget || !selectedRole) return;
    setSaving(true);
    const ok = await approve(approveTarget.userId, selectedRole, approveTarget.notifId);
    setSaving(false);
    if (ok) {
      setApproveTarget(null);
      setSelectedRole("");
    }
  };

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-8 w-8">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Notificações</p>
          </div>
          <ScrollArea className="max-h-80">
            {unreadNotifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma notificação pendente</p>
            ) : (
              unreadNotifications.map((n) => (
                <div key={n.id} className="flex gap-3 px-4 py-3 border-b border-border last:border-0">
                  <AlertTriangle className="h-5 w-5 text-orange-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium text-foreground leading-tight">{n.titulo}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {n.dados?.nome || n.dados?.email || n.mensagem}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{formatBRT(n.created_at)}</p>
                    <div className="flex gap-1.5 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs px-2 border-green-500/50 text-green-500 hover:bg-green-500/10"
                        onClick={() => {
                          setApproveTarget({
                            userId: n.dados?.user_id || "",
                            notifId: n.id,
                            nome: n.dados?.nome || n.dados?.email || "",
                          });
                          setPopoverOpen(false);
                        }}
                      >
                        <Check className="h-3 w-3 mr-1" /> Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs px-2 text-muted-foreground"
                        onClick={() => dismiss(n.id)}
                      >
                        <X className="h-3 w-3 mr-1" /> Ignorar
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Approve Dialog */}
      <Dialog open={!!approveTarget} onOpenChange={() => { setApproveTarget(null); setSelectedRole(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar acesso de {approveTarget?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Selecione o perfil de acesso:</p>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o perfil..." />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleApprove} disabled={!selectedRole || saving}>
              {saving ? "Aprovando..." : "Aprovar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
