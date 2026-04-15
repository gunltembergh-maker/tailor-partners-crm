import { LOGO_DARK_BG } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, ShieldAlert, Clock } from "lucide-react";

export function BlockedUserScreen() {
  const { signOut, profile } = useAuth();

  // Check if user was rejected due to unauthorized domain
  const profileAny = profile as any;
  const isDomainRejected = profileAny?.empresa === "Domínio não autorizado";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <img src={LOGO_DARK_BG} alt="Tailor Partners" className="w-[180px] mb-8" />
      <div className="text-center max-w-md space-y-4">
        {isDomainRejected ? (
          <>
            <ShieldAlert className="h-10 w-10 text-destructive mx-auto" />
            <h1 className="text-xl font-semibold text-foreground">Acesso não autorizado</h1>
            <p className="text-muted-foreground">
              O domínio do seu e-mail não está autorizado para acessar o Hub.
              Entre em contato com o administrador para solicitar acesso.
            </p>
          </>
        ) : (
          <>
            <Clock className="h-10 w-10 text-amber-500 mx-auto" />
            <h1 className="text-xl font-semibold text-foreground">Aguardando aprovação</h1>
            <p className="text-muted-foreground">
              Seu acesso está sendo configurado. Por favor, aguarde a liberação pelo administrador.
            </p>
          </>
        )}
      </div>
      <Button variant="outline" onClick={signOut} className="mt-8">
        <LogOut className="h-4 w-4 mr-2" />
        Sair
      </Button>
    </div>
  );
}
