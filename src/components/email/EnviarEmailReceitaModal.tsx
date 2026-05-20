import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Mail, Loader2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface UsuarioHub {
  user_id: string;
  nome: string;
  email: string;
  role: string;
  empresa: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const MES_NOMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function EnviarEmailReceitaModal({ open, onClose }: Props) {
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [mesOverride, setMesOverride] = useState<string>('auto');
  const [emValidacaoOverride, setEmValidacaoOverride] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios-hub-email', busca],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_buscar_usuarios_hub', {
        p_busca: busca || null,
      });
      if (error) throw error;
      return (data || []) as UsuarioHub[];
    },
    enabled: open,
  });

  const opcoesMes = useMemo(() => {
    const hoje = new Date();
    const out: { value: string; label: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const ano = d.getFullYear();
      const mes = d.getMonth() + 1;
      out.push({
        value: `${ano}-${String(mes).padStart(2, '0')}`,
        label: `${MES_NOMES[mes - 1]}/${ano}`,
      });
    }
    return out;
  }, []);

  const toggle = (userId: string) => {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(userId)) novo.delete(userId);
      else novo.add(userId);
      return novo;
    });
  };

  const selecionarTodos = () => setSelecionados(new Set(usuarios.map((u) => u.user_id)));
  const limparSelecao = () => setSelecionados(new Set());

  const handleEnviar = async () => {
    if (selecionados.size === 0) {
      toast.error('Selecione pelo menos 1 destinatário');
      return;
    }
    setEnviando(true);

    const destinatarios = usuarios.filter((u) => selecionados.has(u.user_id));
    let sucesso = 0;
    let falhas = 0;
    const erros: string[] = [];
    const label = `manual-receita-${new Date().toISOString().slice(0, 10)}`;

    for (const usuario of destinatarios) {
      try {
        const { data, error } = await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'receita-caixa-newsletter',
            recipientEmail: usuario.email,
            idempotencyKey: `manual-receita-${usuario.user_id}-${Date.now()}`,
            templateData: {
              anomes_override: mesOverride && mesOverride !== 'auto' ? mesOverride : null,
              em_validacao_override: emValidacaoOverride,
              recipientName: usuario.nome,
            },
            label,
          },
        });
        if (error) throw error;
        if (data?.skipped) {
          falhas++;
          erros.push(`${usuario.email}: ${data.reason || 'pulado'}`);
        } else {
          sucesso++;
        }
      } catch (err: any) {
        falhas++;
        erros.push(`${usuario.email}: ${err?.message || 'erro desconhecido'}`);
      }
    }

    setEnviando(false);

    if (sucesso > 0 && falhas === 0) {
      toast.success(`Email enviado para ${sucesso} destinatário(s)`);
      onClose();
    } else if (sucesso > 0) {
      toast.warning(`${sucesso} enviado(s), ${falhas} falha(s)`, {
        description: erros.slice(0, 3).join('\n'),
      });
    } else {
      toast.error(`Falha no envio para ${falhas} destinatário(s)`, {
        description: erros.slice(0, 3).join('\n'),
      });
    }
  };

  useEffect(() => {
    if (!open) {
      setBusca('');
      setSelecionados(new Set());
      setMesOverride('auto');
      setEmValidacaoOverride(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !enviando && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#0A2337]" />
            Enviar Receita Caixa por E-mail
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou email..."
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={selecionarTodos}
              className="text-[#0A2337] hover:underline"
            >
              Selecionar todos visíveis
            </button>
            <span className="text-muted-foreground">·</span>
            <button
              type="button"
              onClick={limparSelecao}
              className="text-muted-foreground hover:text-foreground"
            >
              Limpar seleção
            </button>
          </div>

          <ScrollArea className="h-72 rounded-md border border-[#0A2337]/10">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : usuarios.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                Nenhum usuário encontrado
              </div>
            ) : (
              <div className="p-1">
                {usuarios.map((u) => {
                  const checked = selecionados.has(u.user_id);
                  return (
                    <div
                      key={u.user_id}
                      onClick={() => toggle(u.user_id)}
                      className="flex items-start gap-3 p-2 rounded-md hover:bg-[#F4F2EC] cursor-pointer"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(u.user_id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[#0A2337] truncate">
                            {u.nome}
                          </span>
                          {u.role && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                              {u.role}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Mês de referência
              </Label>
              <Select value={mesOverride} onValueChange={setMesOverride}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automático (mês calculado)</SelectItem>
                  {opcoesMes.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-md border border-[#0A2337]/10 p-3">
              <div className="flex-1 pr-3">
                <Label className="text-sm font-medium text-[#0A2337]">
                  Dados em validação
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Mostra badge âmbar no topo do email
                </p>
              </div>
              <Switch
                checked={emValidacaoOverride}
                onCheckedChange={setEmValidacaoOverride}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-3 border-t pt-4">
          <span className="text-sm text-muted-foreground">
            {selecionados.size} destinatário(s) selecionado(s)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={enviando}>
              Cancelar
            </Button>
            <Button
              onClick={handleEnviar}
              disabled={enviando || selecionados.size === 0}
              className="gap-2 bg-[#0A2337] hover:bg-[#1A3A52] text-white"
            >
              {enviando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar para {selecionados.size} destinatário(s)
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
