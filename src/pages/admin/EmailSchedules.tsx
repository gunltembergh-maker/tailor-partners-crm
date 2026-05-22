import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { TailorFrame } from '@/components/layout/TailorFrame';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Play,
  Pause,
  Send,
  Trash2,
  UserPlus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdicionarDestinatarioModal } from '@/components/email/AdicionarDestinatarioModal';
import { useAuth } from '@/hooks/useAuth';

const MODULO = 'receita_caixa';
const MODULO_LABEL = 'Newsletter Receita Caixa';

const DIAS_LABEL: Record<number, string> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb',
};

function fmtDataHora(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtData(iso: string | null | undefined) {
  if (!iso) return '—';
  const [y, m, day] = iso.slice(0, 10).split('-');
  return `${day}/${m}/${y}`;
}

function calcProximoEnvio(diasSemana: number[], horario: string): string {
  // horário formato HH:MM:SS, dias 1=Seg..5=Sex
  const [h, min] = horario.split(':').map(Number);
  const now = new Date();
  // próximo candidato em BRT
  for (let i = 0; i < 14; i++) {
    const cand = new Date(now);
    cand.setDate(now.getDate() + i);
    cand.setHours(h, min, 0, 0);
    const dow = cand.getDay(); // 0=Dom
    const isoDay = dow === 0 ? 7 : dow; // 1=Seg..7=Dom
    if (!diasSemana.includes(isoDay)) continue;
    if (cand.getTime() <= now.getTime()) continue;
    return cand.toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  return '—';
}

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string; Icon: any }> = {
    concluido: { label: 'Concluído', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', Icon: CheckCircle2 },
    falha_parcial: { label: 'Falha parcial', cls: 'bg-amber-100 text-amber-700 border-amber-200', Icon: AlertTriangle },
    falha_total: { label: 'Falha total', cls: 'bg-red-100 text-red-700 border-red-200', Icon: XCircle },
    em_processamento: { label: 'Em processamento', cls: 'bg-blue-100 text-blue-700 border-blue-200', Icon: Clock },
  };
  const cfg = map[status] || { label: status, cls: 'bg-gray-100 text-gray-700 border-gray-200', Icon: Clock };
  const { Icon } = cfg;
  return (
    <Badge variant="outline" className={`${cfg.cls} gap-1 font-medium`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
};

export default function EmailSchedules() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [pauseOpen, setPauseOpen] = useState(false);
  const [motivoPausa, setMotivoPausa] = useState('');
  const [addDestOpen, setAddDestOpen] = useState(false);
  const [removerDestId, setRemoverDestId] = useState<string | null>(null);
  const [disparando, setDisparando] = useState(false);
  const [historicoExpandido, setHistoricoExpandido] = useState<string | null>(null);

  // Edição de schedule
  const [horaEdit, setHoraEdit] = useState<string>('08:30');
  const [diasEdit, setDiasEdit] = useState<number[]>([1, 2, 3, 4, 5]);
  const [ativoEdit, setAtivoEdit] = useState<boolean>(true);
  const [salvando, setSalvando] = useState(false);
  const [proximaExecucao, setProximaExecucao] = useState<Date | null>(null);

  // Config + último disparo
  const { data: config } = useQuery({
    queryKey: ['email-schedule-config', MODULO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_schedules_config')
        .select('*')
        .eq('modulo', MODULO)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: destinatarios = [], refetch: refetchDest } = useQuery({
    queryKey: ['email-destinatarios', MODULO],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_listar_destinatarios_automaticos', { p_modulo: MODULO });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: historico = [], refetch: refetchHist } = useQuery({
    queryKey: ['email-historico', MODULO],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_historico_disparos', { p_modulo: MODULO, p_limit: 30 });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const ultimoDisparo = historico[0];
  const ativo = !!config?.ativo;
  const jaCadastradosSet = useMemo(() => new Set(destinatarios.map((d: any) => d.user_id)), [destinatarios]);

  const proximoEnvio = useMemo(() => {
    if (!config) return '—';
    if (!ativo) return 'Pausado';
    return calcProximoEnvio(config.dias_semana as number[], String(config.horario_envio));
  }, [config, ativo]);

  const handleTogglePausar = async () => {
    if (ativo) {
      setMotivoPausa('');
      setPauseOpen(true);
      return;
    }
    // Reativar
    const { error } = await supabase.rpc('rpc_toggle_schedule', { p_modulo: MODULO, p_motivo: null });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Agendamento reativado');
    qc.invalidateQueries({ queryKey: ['email-schedule-config', MODULO] });
  };

  const confirmarPausa = async () => {
    const { error } = await supabase.rpc('rpc_toggle_schedule', { p_modulo: MODULO, p_motivo: motivoPausa || null });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Agendamento pausado');
    setPauseOpen(false);
    qc.invalidateQueries({ queryKey: ['email-schedule-config', MODULO] });
  };

  const handleDisparar = async () => {
    setDisparando(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-receita-caixa-automatic', {
        body: { force: true, user_id: user?.id },
      });
      if (error) throw error;
      if (data?.skipped) {
        toast.warning(`Pulado: ${data.reason}`);
      } else if (data?.success) {
        toast.success(
          `Disparo concluído — ${data.sucessos}/${data.total_destinatarios} sucesso(s)`,
          { description: data.falhas > 0 ? `${data.falhas} falha(s)` : undefined },
        );
      } else {
        toast.message('Disparo processado', { description: JSON.stringify(data) });
      }
      await Promise.all([refetchHist(), refetchDest()]);
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao disparar');
    } finally {
      setDisparando(false);
    }
  };

  const handleRemover = async () => {
    if (!removerDestId) return;
    const { error } = await supabase.rpc('rpc_remover_destinatario_automatico', { p_id: removerDestId });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Destinatário removido');
    setRemoverDestId(null);
    refetchDest();
  };

  return (
    <AppLayout>
      <TailorFrame>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/emails/log')} className="gap-1 text-[#DFDBBE] hover:bg-white/10 hover:text-[#DFDBBE]">
            <ArrowLeft className="w-4 h-4" />
            Admin
          </Button>
        </div>

        <div>
          <h1 style={{ color: "#DFDBBE" }} className="text-2xl font-bold">Agendamentos de E-mail</h1>
          <p className="text-sm text-[#DFDBBE]/70 mt-1">
            Controle os disparos automáticos das newsletters do Hub.
          </p>
        </div>

        {/* Status do schedule */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg text-[#0A2337]">{MODULO_LABEL}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Horário: {String(config?.horario_envio || '08:00:00').slice(0, 5)} BRT ·{' '}
                {(config?.dias_semana as number[] | undefined)?.map((d) => DIAS_LABEL[d % 7]).join(', ') || '—'} (pulando feriados)
              </p>
            </div>
            <Badge
              variant="outline"
              className={
                ativo
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : 'bg-gray-100 text-gray-700 border-gray-200'
              }
            >
              {ativo ? '✅ Ativo' : '⏸ Pausado'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase text-muted-foreground tracking-wide">Último envio</p>
                <p className="font-medium text-[#0A2337] mt-1">
                  {ultimoDisparo ? fmtDataHora(ultimoDisparo.disparado_em) : 'Nenhum disparo registrado'}
                </p>
                {ultimoDisparo && (
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <StatusBadge status={ultimoDisparo.status} />
                    <span className="text-muted-foreground">
                      {ultimoDisparo.total_sucessos}/{ultimoDisparo.total_destinatarios} sucesso(s), {ultimoDisparo.total_falhas} falha(s)
                    </span>
                  </div>
                )}
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase text-muted-foreground tracking-wide">Próximo envio</p>
                <p className="font-medium text-[#0A2337] mt-1 capitalize">{proximoEnvio}</p>
                {!ativo && config?.motivo_pausa && (
                  <p className="text-xs text-muted-foreground mt-1">Motivo: {config.motivo_pausa}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant={ativo ? 'outline' : 'default'}
                onClick={handleTogglePausar}
                className="gap-2"
              >
                {ativo ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {ativo ? 'Pausar' : 'Reativar'}
              </Button>
              <Button
                onClick={handleDisparar}
                disabled={disparando}
                className="gap-2 bg-[#0A2337] hover:bg-[#1A3A52] text-white"
              >
                {disparando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {disparando ? 'Disparando...' : 'Disparar agora'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Destinatários */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg text-[#0A2337]">
              Destinatários ({destinatarios.length})
            </CardTitle>
            <Button onClick={() => setAddDestOpen(true)} size="sm" className="gap-2 bg-[#0A2337] hover:bg-[#1A3A52] text-white">
              <UserPlus className="w-4 h-4" />
              Adicionar
            </Button>
          </CardHeader>
          <CardContent>
            {destinatarios.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum destinatário cadastrado
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Adicionado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {destinatarios.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium text-[#0A2337]">{d.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{d.email}</TableCell>
                      <TableCell>
                        {d.role && (
                          <Badge variant="outline" className="text-[10px]">
                            {d.role}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtDataHora(d.criado_em)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRemoverDestId(d.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Histórico */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-[#0A2337]">Histórico (últimos 30 disparos)</CardTitle>
          </CardHeader>
          <CardContent>
            {historico.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sem disparos registrados</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Data</TableHead>
                    <TableHead>Disparado em</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historico.map((h: any) => {
                    const exp = historicoExpandido === h.id;
                    const temErros = h.detalhes_erro && Array.isArray(h.detalhes_erro) && h.detalhes_erro.length > 0;
                    return (
                      <>
                        <TableRow
                          key={h.id}
                          className={temErros ? 'cursor-pointer' : ''}
                          onClick={() => temErros && setHistoricoExpandido(exp ? null : h.id)}
                        >
                          <TableCell>
                            {temErros && (exp ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                          </TableCell>
                          <TableCell className="font-medium text-[#0A2337]">{fmtData(h.data_envio)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{fmtDataHora(h.disparado_em)}</TableCell>
                          <TableCell><StatusBadge status={h.status} /></TableCell>
                          <TableCell className="text-xs">
                            {h.total_sucessos}/{h.total_destinatarios} sucesso(s), {h.total_falhas} falha(s)
                          </TableCell>
                          <TableCell className="text-xs">
                            {h.forcado_por_nome ? (
                              <Badge variant="outline" className="text-[10px]">Manual · {h.forcado_por_nome}</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-blue-50">Automático</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                        {exp && temErros && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-red-50">
                              <pre className="text-xs whitespace-pre-wrap text-red-700 p-2">
                                {JSON.stringify(h.detalhes_erro, null, 2)}
                              </pre>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal pausar */}
      <Dialog open={pauseOpen} onOpenChange={setPauseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pausar agendamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Enquanto pausado, nenhum email será enviado automaticamente. Você ainda pode disparar manualmente.
            </p>
            <Textarea
              placeholder="Motivo (opcional)"
              value={motivoPausa}
              onChange={(e) => setMotivoPausa(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPauseOpen(false)}>Cancelar</Button>
            <Button onClick={confirmarPausa} className="bg-[#0A2337] hover:bg-[#1A3A52] text-white">
              Confirmar pausa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal adicionar destinatário */}
      <AdicionarDestinatarioModal
        open={addDestOpen}
        modulo={MODULO}
        jaCadastrados={jaCadastradosSet as Set<string>}
        onClose={() => setAddDestOpen(false)}
        onAdicionado={() => refetchDest()}
      />

      {/* Confirmar remoção */}
      <AlertDialog open={!!removerDestId} onOpenChange={(v) => !v && setRemoverDestId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover destinatário?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário deixará de receber a newsletter automática. Você pode adicioná-lo novamente depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemover} className="bg-red-600 hover:bg-red-700">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </TailorFrame>
    </AppLayout>
  );
}
