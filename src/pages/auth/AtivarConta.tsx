import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ValidacaoToken {
  valido: boolean;
  erro?: "token_invalido" | "ja_ativado" | "expirado";
  email?: string;
  nome?: string;
  empresa?: string | null;
}

export default function AtivarConta() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [validacao, setValidacao] = useState<ValidacaoToken | null>(null);
  const [loading, setLoading] = useState(true);

  const [senhaProvisoria, setSenhaProvisoria] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [ativando, setAtivando] = useState(false);

  useEffect(() => {
    if (!token) {
      setValidacao({ valido: false, erro: "token_invalido" });
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase.rpc("rpc_validar_token_ativacao" as any, { p_token: token });
      if (error || !data) {
        setValidacao({ valido: false, erro: "token_invalido" });
      } else {
        setValidacao(data as ValidacaoToken);
      }
      setLoading(false);
    })();
  }, [token]);

  const senhaValidacoes = useMemo(() => ({
    minLength: novaSenha.length >= 8,
    hasUpper: /[A-Z]/.test(novaSenha),
    hasLower: /[a-z]/.test(novaSenha),
    hasNumber: /[0-9]/.test(novaSenha),
  }), [novaSenha]);

  const senhaForte = Object.values(senhaValidacoes).every(Boolean);
  const senhasConferem = novaSenha === confirmarSenha && novaSenha.length > 0;
  const podeAtivar = senhaProvisoria.length > 0 && senhaForte && senhasConferem;

  const handleAtivar = async () => {
    if (!podeAtivar || !token) return;
    setAtivando(true);
    try {
      const { data, error } = await supabase.functions.invoke("ativar-conta-externa", {
        body: { token, senha_provisoria: senhaProvisoria, nova_senha: novaSenha },
      });
      const d: any = data;
      if (error || d?.error || d?.success === false) {
        const msg = d?.error || error?.message || "Erro ao ativar conta";
        toast.error("Falha na ativação", { description: msg });
        setAtivando(false);
        return;
      }
      toast.success("Conta ativada com sucesso!", { description: "Faça login com sua nova senha." });
      setTimeout(() => navigate("/auth"), 1500);
    } catch (err: any) {
      toast.error("Erro inesperado", { description: err.message });
      setAtivando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A2337]" />
      </div>
    );
  }

  if (!validacao?.valido) {
    const mensagens: Record<string, string> = {
      token_invalido: "Link de ativação inválido. Verifique se você usou o link correto.",
      ja_ativado: "Esta conta já foi ativada. Faça login com suas credenciais.",
      expirado: "Este convite expirou (válido por 7 dias). Solicite um novo ao Admin.",
    };
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8] p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h1 className="text-xl font-semibold text-[#0A2337]">Não foi possível ativar</h1>
            <p className="text-sm text-muted-foreground">
              {mensagens[validacao?.erro || "token_invalido"]}
            </p>
            <Button onClick={() => navigate("/auth")} className="bg-[#0A2337] hover:bg-[#0A2337]/90">
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-[#0A2337]">Bem-vindo ao Hub</h1>
          <p className="text-sm text-[#4B6D88]">Ativação de Conta</p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-[#0A2337]">Olá, {validacao.nome}!</h2>
              {validacao.empresa && (
                <p className="text-sm text-[#4B6D88]">Empresa: {validacao.empresa}</p>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              Você está prestes a ativar seu acesso. Insira a senha provisória recebida no email e defina uma nova senha de acesso.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="prov">Senha provisória *</Label>
              <Input
                id="prov"
                type="password"
                value={senhaProvisoria}
                onChange={(e) => setSenhaProvisoria(e.target.value)}
                placeholder="Recebida no email"
                maxLength={20}
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nova">Nova senha *</Label>
              <div className="relative">
                <Input
                  id="nova"
                  type={showPass ? "text" : "password"}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  maxLength={50}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-2 top-2.5 text-[#73A7B7] hover:text-[#0A2337]"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {novaSenha.length > 0 && (
                <div className="space-y-0.5 mt-2">
                  <ValidationLine ok={senhaValidacoes.minLength} text="Mínimo 8 caracteres" />
                  <ValidationLine ok={senhaValidacoes.hasUpper} text="Pelo menos 1 letra maiúscula" />
                  <ValidationLine ok={senhaValidacoes.hasLower} text="Pelo menos 1 letra minúscula" />
                  <ValidationLine ok={senhaValidacoes.hasNumber} text="Pelo menos 1 número" />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="conf">Confirmar nova senha *</Label>
              <Input
                id="conf"
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Digite novamente"
                maxLength={50}
                autoComplete="new-password"
              />
              {confirmarSenha.length > 0 && !senhasConferem && (
                <p className="text-xs text-red-600">As senhas não conferem</p>
              )}
            </div>

            <Button
              onClick={handleAtivar}
              disabled={!podeAtivar || ativando}
              className="w-full bg-[#0A2337] hover:bg-[#0A2337]/90 gap-2"
            >
              {ativando ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Ativando conta...</>
              ) : (
                "Ativar Conta e Fazer Login"
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-[#4B6D88]">Tailor Partners © 2026</p>
      </div>
    </div>
  );
}

function ValidationLine({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs ${ok ? "text-green-600" : "text-muted-foreground"}`}>
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-current inline-block" />}
      {text}
    </div>
  );
}
