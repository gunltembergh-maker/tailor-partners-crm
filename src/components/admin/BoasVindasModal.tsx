import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import { LOGO_LIGHT_BG } from "@/lib/constants";

interface Props {
  perfil: {
    full_name: string;
    role?: string | null;
    area?: string | null;
  };
  open: boolean;
  onClose: () => void;
}

export function BoasVindasModal({ perfil, open, onClose }: Props) {
  const perfilLabel = perfil.role === "BANKER" ? "Financial Advisor" : perfil.role || "Usuário";
  const firstName = perfil.full_name?.split(" ")[0] || "";

  const handleClose = async () => {
    try {
      await supabase.rpc("rpc_marcar_primeiro_acesso" as any);
    } catch { /* ignore */ }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md text-center">
        <img
          src={LOGO_LIGHT_BG}
          alt="Tailor Partners"
          className="w-32 mx-auto mb-4"
        />
        <div className="text-4xl mb-3">🎯</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Bem-vindo ao Hub, {firstName}!
        </h2>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          Seu acesso como <strong className="text-foreground">{perfilLabel}</strong> está
          configurado e pronto para uso.
          {perfil.area && ` Área: ${perfil.area}.`}
        </p>

        <div className="bg-muted rounded-xl p-4 mb-6 text-left space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            O que você encontra no Hub
          </p>
          {[
            { icon: "📊", text: "Captação e AuC da sua carteira em tempo real" },
            { icon: "💰", text: "Receita Bruta Tailor e ROA anualizado" },
            { icon: "👥", text: "Custódia, vencimentos e perfil dos clientes" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
              <span className="text-lg">{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        <Button
          className="w-full"
          onClick={handleClose}
        >
          Começar a usar o Hub →
        </Button>
      </DialogContent>
    </Dialog>
  );
}
