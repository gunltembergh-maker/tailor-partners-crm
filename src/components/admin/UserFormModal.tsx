import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";

const PERFIS = ["ADMIN", "LIDER", "BANKER", "FINDER", "ASSESSOR", "OPERACOES"];

function cpfMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
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
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<UserFormData> | null;
  onSaved: () => void;
}

export function UserFormModal({ open, onOpenChange, initialData, onSaved }: Props) {
  const { toast } = useToast();
  const isEdit = initialData?.isEdit ?? false;

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [perfil, setPerfil] = useState("");
  const [banker, setBanker] = useState("");
  const [finder, setFinder] = useState("");
  const [empresa, setEmpresa] = useState("Tailor Partners");
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

  const handleSave = async () => {
    if (!email.trim() || !nome.trim()) return;
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
        p_cpf: cpf.replace(/\D/g, ""),
      });
      if (error) throw error;
      const result = data as any;
      if (result?.success === false) {
        toast({ title: "Erro", description: result.message, variant: "destructive" });
      } else {
        toast({ title: isEdit ? "Usuário atualizado!" : "Pré-cadastro criado!" });
        onOpenChange(false);
        onSaved();
      }
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

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
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@tailorpartners.com.br"
              disabled={isEdit}
            />
          </div>
          <div className="space-y-1">
            <Label>CPF</Label>
            <Input
              value={cpf}
              onChange={(e) => setCpf(cpfMask(e.target.value))}
              placeholder="000.000.000-00"
              maxLength={14}
            />
          </div>
          <div className="space-y-1">
            <Label>Perfil de Acesso</Label>
            <Select value={perfil} onValueChange={setPerfil}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {PERFIS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {perfil === "BANKER" && (
            <div className="space-y-1">
              <Label>Banker Vinculado</Label>
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
          <div className="space-y-1">
            <Label>Empresa</Label>
            <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Tailor Partners" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={!email.trim() || !nome.trim() || saving}>
            {saving ? "Salvando..." : isEdit ? "Salvar" : "Pré-cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
