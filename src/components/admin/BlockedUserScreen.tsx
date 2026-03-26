import { LOGO_DARK_BG } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut } from "lucide-react";

export function BlockedUserScreen() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <img src={LOGO_DARK_BG} alt="Tailor Partners" className="w-[180px] mb-8" />
      <div className="text-center max-w-md space-y-4">
        <h1 className="text-xl font-semibold text-foreground">Acesso em configuração</h1>
        <p className="text-muted-foreground">
          Seu acesso está sendo configurado. Por favor, aguarde a liberação pelo administrador.
        </p>
      </div>
      <Button variant="outline" onClick={signOut} className="mt-8">
        <LogOut className="h-4 w-4 mr-2" />
        Sair
      </Button>
    </div>
  );
}
