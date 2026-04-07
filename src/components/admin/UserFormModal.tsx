import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";

const PERFIS = ["ADMIN", "LIDER", "BANKER", "FINDER", "ASSESSOR", "OPERACOES"];

function cpfMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function validarCPF(cpf: string): boolean {
  const nums = cpf.replace(/\D/g, "");
  if (nums.length !== 11) return false;
  if (/^(\d)\1+$/.test(nums)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(nums[i]) * (10 - i);
  let dig1 = 11 - (sum % 11);
  if (dig1 >= 10) dig1 = 0;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(nums[i]) * (11 - i);
  let dig2 = 11 - (sum % 11);
  if (dig2 >= 10) dig2 = 0;

  return dig1 === parseInt(nums[9]) && dig2 === parseInt(nums[10]);
}

export interface UserFormData {
  email: string;
  nome: string;
  cpf: string;
  perfil: string;
  banker: string;
  finder: string;
  empresa: string;
  isEdit: boolean;
  editProfileId?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<UserFormData> | null;
  onSaved: () => void;
}

export function UserFormModal({ open, onOpenChange, initialData, onSaved }: Props) {
  
  const isEdit = initialData?.isEdit ?? false;

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [perfil, setPerfil] = useState("");
  const [banker, setBanker] = useState("");
  const [finder, setFinder] = useState("");
  const [empresa, setEmpresa] = useState("Tailor Partners");
  const [area, setArea] = useState("");
  const [gestor, setGestor] = useState("");
  const [operacaoTipo, setOperacaoTipo] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [cpfValid, setCpfValid] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNome(initialData?.nome || "");
      setEmail(initialData?.email || "");
      setCpf(initialData?.cpf ? cpfMask(initialData.cpf) : "");
      setPerfil(initialData?.perfil || "");
      setBanker(initialData?.banker || "");
      setFinder(initialData?.finder || "");
      setEmpresa(initialData?.empresa || "Tailor Partners");
      setArea((initialData as any)?.area || "");
      setGestor((initialData as any)?.gestor || "");
      setOperacaoTipo((initialData as any)?.operacao_tipo || "");
      setEmailError(null);
      setCpfError(null);
      setCpfValid(null);
    }
  }, [open, initialData]);

  const { data: bankerList } = useQuery({
    queryKey: ["admin-banker-list"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_filtro_financial_advisors" as any);
      if (error) throw error;
      return (data as any[])?.map((r: any) => r.banker).filter(Boolean).sort() as string[];
    },
    enabled: open,
  });

  const { data: finderList } = useQuery({
    queryKey: ["admin-finder-list"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_lista_finders" as any);
      if (error) throw error;
      return (data as any[])?.map((r: any) => r.finder).filter(Boolean).sort() as string[];
    },
    enabled: open,
  });

  const validateEmail = useCallback(async (emailValue: string) => {
    if (!emailValue || !emailValue.includes("@")) {
      setEmailError(null);
      setEmpresa("Tailor Partners");
      return;
    }
    try {
      const { data, error } = await supabase.rpc("rpc_validar_dominio" as any, { p_email: emailValue });
      if (error) throw error;
      const result = data as any;
      if (result?.autorizado === false) {
        setEmailError("Domínio não autorizado. Apenas e-mails @tailorpartners.com.br e @lavoroseguros.com.br são permitidos.");
        setEmpresa("");
      } else {
        setEmailError(null);
        setEmpresa(result?.empresa || "Tailor Partners");
      }
    } catch {
      const dominio = emailValue.split("@")[1];
      const { data: domData } = await supabase
        .from("dominio_empresa")
        .select("empresa")
        .eq("dominio", dominio)
        .maybeSingle();
      if (domData) {
        setEmailError(null);
        setEmpresa(domData.empresa);
      } else {
        setEmailError("Domínio não autorizado. Apenas e-mails @tailorpartners.com.br e @lavoroseguros.com.br são permitidos.");
        setEmpresa("");
      }
    }
  }, []);

  const handleCpfChange = (value: string) => {
    const masked = cpfMask(value);
    setCpf(masked);
    const digits = masked.replace(/\D/g, "");
    if (digits.length < 11) {
      setCpfValid(null);
      setCpfError(null);
      return;
    }
    if (!validarCPF(digits)) {
      setCpfValid(false);
      setCpfError("CPF inválido");
    } else {
      setCpfValid(true);
      setCpfError(null);
    }
  };

  const handleCpfBlur = async () => {
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11 || !validarCPF(digits)) return;

    try {
      const params: any = { p_cpf: digits };
      if (isEdit && initialData?.editProfileId) {
        params.p_exclude_id = initialData.editProfileId;
      }
      const { data, error } = await supabase.rpc("rpc_verificar_cpf" as any, params);
      if (error) throw error;
      const result = data as any;
      if (result?.disponivel === false) {
        setCpfError(result.mensagem || "Este CPF já está cadastrado no Hub");
        setCpfValid(false);
      } else {
        setCpfError(null);
        setCpfValid(true);
      }
    } catch {
      // Silently ignore check errors
    }
  };

  const handleSave = async () => {
    if (!email.trim() || !nome.trim() || emailError || cpfError) return;
    const digits = cpf.replace(/\D/g, "");
    if (digits.length > 0 && digits.length !== 11) {
      setCpfError("CPF deve ter 11 dígitos");
      return;
    }
    if (digits.length === 11 && !validarCPF(digits)) {
      setCpfError("CPF inválido");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("rpc_admin_salvar_usuario" as any, {
        p_email: email,
        p_nome: nome,
        p_role: perfil,
        p_perfil_nome: perfil,
        p_banker_name: perfil === "BANKER" ? banker : null,
        p_finder_name: perfil === "FINDER" ? finder : null,
        p_empresa: empresa,
        p_advisor_name: null,
        p_cpf: digits || null,
        p_area: area || null,
        p_gestor: gestor || null,
        p_operacao_tipo: perfil === "OPERACOES" ? operacaoTipo || null : null,
      });
      if (error) throw error;
      const result = data as any;
      if (result?.success === false) {
        toast.error(result.message || "Erro ao salvar", { duration: 4000 });
      } else {
        toast.success(isEdit ? "Usuário atualizado!" : "Pré-cadastro criado!", { duration: 3000 });
        onOpenChange(false);
        onSaved();
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar", { duration: 4000 });
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = email.trim() && nome.trim() && !emailError && !cpfError && empresa;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Usuário" : "Pré-cadastrar Usuário"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Nome Completo *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do colaborador" />
          </div>
          <div className="space-y-1">
            <Label>E-mail Corporativo *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              onBlur={() => !isEdit && validateEmail(email)}
              placeholder="nome@tailorpartners.com.br"
              disabled={isEdit}
              className={emailError ? "border-destructive" : ""}
            />
            {emailError && (
              <p className="text-xs text-destructive mt-1">{emailError}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>CPF</Label>
            <div className="relative">
              <Input
                value={cpf}
                onChange={(e) => handleCpfChange(e.target.value)}
                onBlur={handleCpfBlur}
                placeholder="000.000.000-00"
                maxLength={14}
                className={cpfError ? "border-destructive pr-9" : cpfValid ? "border-green-500 pr-9" : ""}
              />
              {cpfValid === true && !cpfError && (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
              {cpfValid === false && (
                <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
              )}
            </div>
            {cpfError && (
              <p className="text-xs text-destructive mt-1">{cpfError}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Área</Label>
            <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Ex: Comercial, Operações, RH" />
          </div>
          <div className="space-y-1">
            <Label>Gestor Direto</Label>
            <Input value={gestor} onChange={(e) => setGestor(e.target.value)} placeholder="Ex: Felipe Nunes" />
          </div>
          <div className="space-y-1">
            <Label>Perfil de Acesso</Label>
            <Select value={perfil} onValueChange={setPerfil}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {PERFIS.map((p) => (
                  <SelectItem key={p} value={p}>{p === "BANKER" ? "FINANCIAL ADVISOR" : p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {perfil === "BANKER" && (
            <div className="space-y-1">
              <Label>Financial Advisor Vinculado</Label>
              <Select value={banker} onValueChange={setBanker}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {bankerList?.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {perfil === "FINDER" && (
            <div className="space-y-1">
              <Label>Finder Vinculado</Label>
              <Select value={finder} onValueChange={setFinder}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {finderList?.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {perfil === "OPERACOES" && (
            <div className="space-y-1">
              <Label>Tipo de Operação</Label>
              <Select value={operacaoTipo} onValueChange={setOperacaoTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Middle">Middle</SelectItem>
                  <SelectItem value="Operações Assistente">Operações Assistente</SelectItem>
                  <SelectItem value="Operação Assistente Financial">Operação Assistente Financial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label>Empresa</Label>
            <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Tailor Partners" readOnly={!isEdit && !!empresa && !emailError} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={!isFormValid || saving}>
            {saving ? "Salvando..." : isEdit ? "Salvar" : "Pré-cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
