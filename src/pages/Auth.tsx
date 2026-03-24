import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Mail, AlertTriangle, Eye, EyeOff } from "lucide-react";

// CPF mask helper
function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

// CPF validation algorithm
function isValidCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  return rest === parseInt(digits[10]);
}

// Password strength
function getPasswordStrength(pw: string): { label: string; color: string; width: string } {
  if (pw.length === 0) return { label: "", color: "", width: "0%" };
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  const score = (pw.length >= 12 ? 2 : pw.length >= 8 ? 1 : 0) + (hasUpper ? 1 : 0) + (hasLower ? 1 : 0) + (hasNumber ? 1 : 0) + (hasSpecial ? 1 : 0);
  if (score >= 5) return { label: "Forte", color: "bg-green-500", width: "100%" };
  if (score >= 3) return { label: "Média", color: "bg-yellow-500", width: "66%" };
  return { label: "Fraca", color: "bg-red-500", width: "33%" };
}

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [empresa, setEmpresa] = useState("Tailor Partners");
  const [loading, setLoading] = useState(false);
  const [cpfError, setCpfError] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isBlocked = searchParams.get("blocked") === "true";

  const strength = getPasswordStrength(password);

  const handleCpfBlur = async () => {
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11) return;
    if (!isValidCpf(cpf)) {
      setCpfError("CPF inválido. Verifique os dígitos.");
      return;
    }
    const { data } = await supabase.from("profiles").select("id").eq("cpf", digits).limit(1);
    if (data && data.length > 0) {
      setCpfError("CPF já cadastrado na plataforma.");
    } else {
      setCpfError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.endsWith("@tailorpartners.com.br")) {
      toast({
        title: "Domínio não autorizado",
        description: "Acesso restrito a colaboradores Tailor Partners. Use seu e-mail corporativo.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
      } else {
        navigate("/");
      }
    } else {
      // Validate signup fields
      if (fullName.trim().length < 3) {
        toast({ title: "Nome muito curto", description: "Informe pelo menos 3 caracteres.", variant: "destructive" });
        setLoading(false);
        return;
      }
      const cpfDigits = cpf.replace(/\D/g, "");
      if (!isValidCpf(cpf)) {
        toast({ title: "CPF inválido", description: "Verifique os dígitos do CPF.", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (cpfError) {
        toast({ title: "CPF já cadastrado", description: cpfError, variant: "destructive" });
        setLoading(false);
        return;
      }
      if (password.length < 8) {
        toast({ title: "Senha fraca", description: "A senha deve ter pelo menos 8 caracteres.", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        toast({ title: "Senhas não conferem", description: "A confirmação de senha deve ser igual.", variant: "destructive" });
        setLoading(false);
        return;
      }

      const { error } = await signUp(email, password, fullName, cpfDigits, empresa);
      if (error) {
        toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
      } else {
        setConfirmedEmail(email);
        setShowConfirmation(true);
      }
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: confirmedEmail });
    if (error) {
      toast({ title: "Erro ao reenviar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "E-mail reenviado!", description: "Verifique sua caixa de entrada." });
    }
    setResending(false);
  };

  if (showConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md animate-fade-in text-center">
          <div className="mb-8">
            <h1 className="text-4xl font-display font-bold text-primary tracking-tight">Tailor</h1>
            <p className="text-xs tracking-[0.3em] text-muted-foreground uppercase mt-1">Partners</p>
          </div>

          <Card className="shadow-lg border-border/50">
            <CardContent className="pt-8 pb-8 space-y-4">
              <Mail className="h-12 w-12 text-primary mx-auto" />
              <h2 className="text-xl font-semibold text-foreground">Confirme seu e-mail</h2>
              <p className="text-sm text-muted-foreground">
                Enviamos um link de confirmação para:
              </p>
              <p className="text-sm font-medium text-foreground">{confirmedEmail}</p>
              <p className="text-sm text-muted-foreground">
                Acesse seu e-mail corporativo e clique no link para ativar sua conta.
              </p>
              <p className="text-sm text-muted-foreground">
                Após confirmar, você poderá acessar o Hub Tailor com suas credenciais.
              </p>
              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Não recebeu?</p>
                <Button variant="outline" size="sm" onClick={handleResend} disabled={resending}>
                  {resending ? "Reenviando..." : "Reenviar e-mail"}
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setShowConfirmation(false); setIsLogin(true); }}>
                Voltar ao login
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-primary tracking-tight">Tailor</h1>
          <p className="text-xs tracking-[0.3em] text-muted-foreground uppercase mt-1">Partners</p>
          <p className="text-sm text-muted-foreground mt-4">CRM Comercial</p>
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
          <CardHeader className="pb-4">
            <div className="flex gap-2">
              <Button variant={isLogin ? "default" : "ghost"} size="sm" onClick={() => setIsLogin(true)} className="flex-1">
                Entrar
              </Button>
              <Button variant={!isLogin ? "default" : "ghost"} size="sm" onClick={() => setIsLogin(false)} className="flex-1">
                Cadastrar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome Completo</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Seu nome completo"
                      required
                      minLength={3}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">E-mail Corporativo</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@tailorpartners.com.br"
                  required
                />
              </div>

              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={cpf}
                      onChange={(e) => { setCpf(maskCpf(e.target.value)); setCpfError(""); }}
                      onBlur={handleCpfBlur}
                      placeholder="000.000.000-00"
                      required
                      maxLength={14}
                    />
                    {cpfError && <p className="text-xs text-destructive">{cpfError}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="empresa">Empresa</Label>
                    <Input
                      id="empresa"
                      value={empresa}
                      onChange={(e) => setEmpresa(e.target.value)}
                      placeholder="Tailor Partners"
                      required
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={isLogin ? 6 : 8}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {!isLogin && password.length > 0 && (
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${strength.color} transition-all`} style={{ width: strength.width }} />
                    </div>
                    <p className="text-xs text-muted-foreground">Força: {strength.label}</p>
                  </div>
                )}
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPw ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={8}
                    />
                    <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-destructive">Senhas não conferem</p>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Carregando..." : isLogin ? "Entrar" : "Cadastrar"}
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
