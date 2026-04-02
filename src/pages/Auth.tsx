import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Eye, EyeOff, Lock, ArrowLeft } from "lucide-react";
import { LOGO_LIGHT_BG } from "@/lib/constants";
import { Separator } from "@/components/ui/separator";
import { lovable } from "@/integrations/lovable/index";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isBlocked = searchParams.get("blocked") === "true";

  const handleMicrosoftLogin = async () => {
    setMsLoading(true);
    setLoginError("");
    try {
      const result = await lovable.auth.signInWithOAuth("microsoft", {
        redirect_uri: window.location.origin,
      });
      if (result?.error) {
        setLoginError(result.error.message || "Erro ao conectar com Microsoft");
        toast({ title: "Erro ao conectar com Microsoft", variant: "destructive" });
      }
    } catch (err: any) {
      setLoginError(err?.message ?? "Erro ao conectar com Microsoft");
    }
    setMsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setLoginError("Preencha todos os campos para continuar.");
      return;
    }
    setLoading(true);
    setLoginError("");

    try {
      const { error } = await signIn(email.trim().toLowerCase(), password);
      if (error) {
        if (error.message?.includes("Invalid login")) {
          setLoginError("E-mail não cadastrado no Hub ou senha incorreta. Verifique e tente novamente.");
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setLoginError("Preencha o e-mail corporativo.");
      return;
    }
    setForgotLoading(true);
    setLoginError("");
    try {
      await supabase.auth.resetPasswordForEmail(forgotEmail.trim().toLowerCase(), {
        redirectTo: "https://hub.tailorpartners.com.br/reset-password",
      });
      setForgotSent(true);
    } catch {
      // show success regardless for security
      setForgotSent(true);
    }
    setForgotLoading(false);
  };

  // Forgot password view
  if (forgotMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8 flex flex-col items-center">
            <img src={LOGO_LIGHT_BG} alt="Tailor Partners" className="w-40" />
          </div>

          <Card className="shadow-lg border-border/50">
            <CardHeader className="pb-4 text-center">
              <h2 className="text-lg font-semibold text-foreground">Esqueci minha senha</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Informe seu e-mail corporativo para receber o link de redefinição.
              </p>
            </CardHeader>
            <CardContent>
              {forgotSent ? (
                <div className="space-y-4 text-center">
                  <div className="rounded-lg bg-green-50 border border-green-200 p-4 dark:bg-green-950/30 dark:border-green-800">
                    <p className="text-sm text-green-800 dark:text-green-300">
                      Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha em instantes. Verifique sua caixa de entrada corporativa.
                    </p>
                  </div>
                  <Button variant="ghost" className="w-full" onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(""); }}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">E-mail Corporativo</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => { setForgotEmail(e.target.value); setLoginError(""); }}
                      placeholder="nome@empresa.com.br"
                      required
                    />
                  </div>

                  {loginError && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">{loginError}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={forgotLoading}>
                    {forgotLoading ? "Enviando..." : "Enviar link de redefinição"}
                  </Button>

                  <Button type="button" variant="ghost" className="w-full" onClick={() => { setForgotMode(false); setLoginError(""); }}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao login
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Acesso restrito a Colaboradores Grupo Tailor Partners © 2026
          </p>
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
            {/* Microsoft Button - PRINCIPAL */}
            <Button
              type="button"
              className="w-full flex items-center gap-3 h-12 text-white font-semibold text-[15px]"
              style={{ backgroundColor: "#082537" }}
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

            <p className="text-center text-xs text-muted-foreground mt-2 mb-4">
              Para colaboradores do Grupo Tailor
            </p>

            <div className="relative my-5">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                ou acesse com senha
              </span>
            </div>

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
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setForgotMode(true); setForgotEmail(email); setLoginError(""); }}
                    className="text-xs text-primary hover:underline"
                  >
                    Esqueci minha senha
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
