import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Check, X, ShieldCheck, UserPlus, AlertTriangle, ArrowLeft } from "lucide-react";
import { LOGO_LIGHT_BG } from "@/lib/constants";

const validarSenha = (senha: string) => ({
  tamanho: senha.length >= 10,
  maiuscula: /[A-Z]/.test(senha),
  minuscula: /[a-z]/.test(senha),
  numero: /\d/.test(senha),
  especial: /[!@#$%^&*()_+\-=\[\]{}|;':",.<>?\/]/.test(senha),
});

const senhaValida = (senha: string) => Object.values(validarSenha(senha)).every(Boolean);

function getStrength(senha: string): { label: string; color: string; percent: number } {
  const v = validarSenha(senha);
  const score = Object.values(v).filter(Boolean).length;
  if (score <= 2) return { label: "Fraca", color: "bg-red-500", percent: 33 };
  if (score <= 4) return { label: "Média", color: "bg-yellow-500", percent: 66 };
  return { label: "Forte", color: "bg-green-500", percent: 100 };
}

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [isInvite, setIsInvite] = useState(false);
  const [errorState, setErrorState] = useState<{ code: string; description: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      // Handle error states from expired/invalid links
      if (hash.includes("error=")) {
        const params = new URLSearchParams(hash.substring(1));
        const errorCode = params.get("error_code");
        const errorDesc = params.get("error_description")?.replace(/\+/g, " ");
        setErrorState({ code: errorCode || "unknown", description: errorDesc || "Link inválido ou expirado." });
        return;
      }
      if (hash.includes("type=invite") || hash.includes("type=magiclink")) {
        setIsInvite(true);
        setReady(true);
      } else if (hash.includes("type=recovery")) {
        setReady(true);
      }
    }
    // Also check if user already has a session (came from email link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    // Listen for auth events (SIGNED_IN from token exchange)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checks = validarSenha(password);
  const allValid = senhaValida(password) && password === confirmPassword && confirmPassword.length > 0;
  const strength = getStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error("Erro ao atualizar senha", { description: error.message });
    } else {
      toast.success("Senha atualizada com sucesso!");
      navigate("/dashboards/comercial", { replace: true });
    }
    setLoading(false);
  };

  const criterios = [
    { key: "tamanho", label: "Mínimo 10 caracteres" },
    { key: "maiuscula", label: "Letra maiúscula (A-Z)" },
    { key: "minuscula", label: "Letra minúscula (a-z)" },
    { key: "numero", label: "Número (0-9)" },
    { key: "especial", label: "Caractere especial (!@#$%^&*)" },
  ] as const;

  const title = isInvite ? "Criar sua Senha" : "Redefinir Senha";
  const subtitle = isInvite
    ? "Bem-vindo ao Hub Tailor Partners! Crie uma senha segura para acessar a plataforma."
    : "Crie uma nova senha segura para acessar o Hub.";
  const Icon = isInvite ? UserPlus : ShieldCheck;
  const buttonLabel = isInvite ? "Criar Senha e Acessar" : "Salvar Nova Senha";

  // Show error state for expired/invalid links
  if (errorState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8 flex flex-col items-center">
            <img src={LOGO_LIGHT_BG} alt="Tailor Partners" className="w-40" />
          </div>
          <Card className="shadow-lg border-border/50">
            <CardHeader className="pb-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <h2 className="text-lg font-semibold text-foreground">Link Expirado</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-center">
                <p className="text-sm text-destructive">
                  {errorState.code === "otp_expired"
                    ? "Este link expirou. Solicite um novo convite ou redefinição de senha ao administrador."
                    : errorState.description}
                </p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => navigate("/auth", { replace: true })}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Ir para o Login
              </Button>
            </CardContent>
          </Card>
          <p className="text-center text-xs text-muted-foreground mt-6">
            Acesso restrito a Colaboradores Grupo Tailor Partners © 2026
          </p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md animate-fade-in text-center">
          <div className="mb-8 flex flex-col items-center">
            <img src={LOGO_LIGHT_BG} alt="Tailor Partners" className="w-40" />
          </div>
          <Card className="shadow-lg border-border/50">
            <CardContent className="py-10">
              <p className="text-muted-foreground">Verificando seu acesso...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8 flex flex-col items-center">
          <img src={LOGO_LIGHT_BG} alt="Tailor Partners" className="w-40" />
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader className="pb-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Icon className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••"
                    required
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <p className="text-xs text-destructive">As senhas não coincidem.</p>
                )}
              </div>

              {/* Strength bar */}
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Força da senha</span>
                    <span className="font-medium">{strength.label}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: `${strength.percent}%` }} />
                  </div>
                </div>
              )}

              {/* Checklist */}
              <div className="space-y-1.5 rounded-lg border border-border p-3">
                {criterios.map(({ key, label }) => {
                  const ok = checks[key];
                  return (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      {ok ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-muted-foreground/50" />}
                      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                    </div>
                  );
                })}
              </div>

              <Button type="submit" className="w-full" disabled={!allValid || loading}>
                {loading ? "Salvando..." : buttonLabel}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Acesso restrito a Colaboradores Grupo Tailor Partners © 2026
        </p>
      </div>
    </div>
  );
}
