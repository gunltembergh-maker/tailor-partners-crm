import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Eye, EyeOff, Lock } from "lucide-react";
import { LOGO_LIGHT_BG } from "@/lib/constants";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isBlocked = searchParams.get("blocked") === "true";

  const handleMicrosoftLogin = async () => {
    setMsLoading(true);
    setLoginError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          scopes: 'email openid profile',
          redirectTo: 'https://hub.tailorpartners.com.br/dashboards/comercial',
        }
      });
      if (error) {
        setLoginError(error.message);
        toast({ title: "Erro ao conectar com Microsoft", variant: "destructive" });
      }
    } catch (err: any) {
      setLoginError(err?.message ?? "Erro ao conectar com Microsoft");
    }
    setMsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError("");

    try {
      const { error } = await signIn(email.trim().toLowerCase(), password);
      if (error) {
        if (error.message?.includes("Invalid login")) {
          setLoginError("O acesso ao Hub é por convite. Entre em contato com o administrador.");
        } else {
          setLoginError(error.message);
        }
      } else {
        navigate("/");
      }
    } catch (error: any) {
      setLoginError(error?.message ?? "Erro ao autenticar.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8 flex flex-col items-center">
          <img src={LOGO_LIGHT_BG} alt="Tailor Partners" className="w-40" />
        </div>

        {isBlocked && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Seu acesso foi revogado. Entre em contato com o administrador.
            </AlertDescription>
          </Alert>
        )}

        <Card className="shadow-lg border-border/50">
          <CardHeader className="pb-4 text-center">
            <h2 className="text-lg font-semibold text-foreground">Acessar o Hub</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail Corporativo</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setLoginError(""); }}
                  placeholder="nome@empresa.com.br"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setLoginError(""); }}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{loginError}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Carregando..." : "Entrar"}
              </Button>
            </form>

            <div className="relative my-5">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                ou
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center gap-3 h-11 border-border"
              onClick={handleMicrosoftLogin}
              disabled={msLoading}
            >
              {msLoading ? (
                "Conectando..."
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                    <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                    <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                    <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                  </svg>
                  Entrar com Microsoft
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground mt-2">
              Para colaboradores do Grupo Tailor
            </p>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span>Acesso somente por convite</span>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Acesso restrito a Colaboradores Grupo Tailor Partners © 2026
        </p>
      </div>
    </div>
  );
}
