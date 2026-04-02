import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Check, X, ShieldCheck } from "lucide-react";
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
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for recovery session from hash fragment
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      setReady(true);
    } else {
      // Also check if user already has a session (came from email link)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setReady(true);
      });
    }
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
      toast({ title: "Erro ao atualizar senha", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha atualizada com sucesso!" });
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8 flex flex-col items-center">
          <img src={LOGO_LIGHT_BG} alt="Tailor Partners" className="w-40" />
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader className="pb-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Redefinir Senha</h2>
            </div>
            <p className="text-sm text-muted-foreground">Crie uma nova senha segura para acessar o Hub.</p>
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
                {loading ? "Salvando..." : "Salvar Nova Senha"}
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
