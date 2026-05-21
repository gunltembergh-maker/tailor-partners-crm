import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus2, Mail, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DOMINIOS_PESSOAIS = new Set([
  "gmail.com", "googlemail.com",
  "hotmail.com", "hotmail.com.br", "outlook.com", "outlook.com.br",
  "live.com", "live.com.br", "msn.com",
  "yahoo.com", "yahoo.com.br", "ymail.com", "rocketmail.com",
  "icloud.com", "me.com", "mac.com",
  "aol.com", "aol.com.br",
  "protonmail.com", "proton.me", "pm.me",
  "mail.com", "gmx.com", "gmx.net", "gmx.com.br",
  "zoho.com", "fastmail.com", "tutanota.com",
  "bol.com.br", "uol.com.br", "terra.com.br", "ig.com.br",
  "r7.com", "oi.com.br", "globo.com", "globomail.com",
]);

import { usePerfisDisponiveisOptions } from "@/hooks/usePerfisDisponiveis";

interface Props {
  open: boolean;
  onClose: () => void;
  onSucesso?: () => void;
}

export function ConvidarExternoModal({ open, onClose, onSucesso }: Props) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState<string>("");
  const [empresa, setEmpresa] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { options: PERFIS_DISPONIVEIS, isLoading: loadingPerfis } = usePerfisDisponiveisOptions();

  const emailErro = useMemo(() => {
    if (!email) return null;
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) return "Formato de email inválido";
    const dominio = email.split("@")[1]?.toLowerCase();
    if (DOMINIOS_PESSOAIS.has(dominio)) {
      return "Emails pessoais (Gmail, Hotmail, etc.) não são aceitos. Use email corporativo.";
    }
    return null;
  }, [email]);

  const podeEnviar =
    nome.trim().length >= 3 && email.trim().length > 0 && !emailErro && perfil.length > 0;

  const reset = () => {
    setNome(""); setEmail(""); setPerfil(""); setEmpresa(""); setObservacoes("");
  };

  const handleEnviar = async () => {
    if (!podeEnviar) return;
    setEnviando(true);
    try {
      const { data: convite, error: errConvite } = await supabase.rpc(
        "rpc_admin_convidar_externo" as any,
        {
          p_email: email.trim().toLowerCase(),
          p_nome: nome.trim(),
          p_perfil_role: perfil,
          p_empresa: empresa.trim() || null,
          p_observacoes: observacoes.trim() || null,
        }
      );
      if (errConvite) {
        toast.error("Erro ao criar convite", { description: errConvite.message });
        setEnviando(false);
        return;
      }
      const c: any = convite;
      const { error: errEnvio } = await supabase.functions.invoke(
        "send-convite-externo-email",
        {
          body: {
            email: c.email,
            nome: c.nome,
            token: c.token,
            senha_provisoria: c.senha_provisoria,
            empresa: empresa.trim() || null,
          },
        }
      );
      if (errEnvio) {
        toast.warning("Convite criado, mas falhou ao enviar email", {
          description: "Reenvie pela tela de gestão de usuários.",
        });
      } else {
        toast.success("Convite enviado com sucesso!", {
          description: `Email enviado para ${c.email}. Expira em 7 dias.`,
        });
      }
      reset();
      onSucesso?.();
    } catch (err: any) {
      toast.error("Erro inesperado", { description: err.message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !enviando && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus2 className="w-5 h-5 text-[#0A2337]" />
            Convidar Usuário Externo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
            💼 Use este formulário para convidar Conselheiros, Sócios investidores ou outros colaboradores externos ao grupo Tailor.
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ext-nome">Nome completo *</Label>
            <Input id="ext-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: André Guimarães" maxLength={100} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ext-email">Email corporativo *</Label>
            <Input
              id="ext-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ex: nome@empresa.com.br"
              maxLength={150}
              className={emailErro ? "border-red-300 focus-visible:ring-red-200" : ""}
            />
            {emailErro && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {emailErro}
              </p>
            )}
            {!emailErro && email && (
              <p className="text-xs text-green-600">✓ Email corporativo válido</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Perfil de acesso *</Label>
            <Select value={perfil} onValueChange={setPerfil} disabled={loadingPerfis}>
              <SelectTrigger>
                <SelectValue placeholder={loadingPerfis ? "Carregando..." : "Selecionar perfil..."} />
              </SelectTrigger>
              <SelectContent>
                {PERFIS_DISPONIVEIS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ext-empresa">Empresa (opcional)</Label>
            <Input id="ext-empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Ex: H2 Grupo" maxLength={100} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ext-obs">Observações (opcional)</Label>
            <Textarea id="ext-obs" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Ex: Conselheiro investidor" rows={2} maxLength={500} />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-xs text-blue-900 font-medium mb-1">Ao confirmar:</p>
            <ul className="text-xs text-blue-800 space-y-0.5 pl-4 list-disc">
              <li>Sistema gera senha provisória aleatória</li>
              <li>Convite expira em 7 dias</li>
              <li>Email enviado com link de ativação</li>
              <li>No 1º acesso, usuário define nova senha</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={enviando}>Cancelar</Button>
          <Button onClick={handleEnviar} disabled={!podeEnviar || enviando} className="bg-[#0A2337] hover:bg-[#0A2337]/90 gap-2">
            {enviando ? (<><Loader2 className="w-4 h-4 animate-spin" />Enviando...</>) : (<><Mail className="w-4 h-4" />Enviar Convite</>)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
