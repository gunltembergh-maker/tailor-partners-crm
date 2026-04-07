import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import TailorLoader from "@/components/TailorLoader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Megaphone, CalendarIcon, ImageOff } from "lucide-react";
import { PopupCard } from "@/components/PopupComunicado";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const LOGO_COMPLETA = "https://jtlelokzpqkgvlwomfus.supabase.co/storage/v1/object/public/assets/Logo%20Tailor.png";
const LOGO_TRANSPARENTE = "https://jtlelokzpqkgvlwomfus.supabase.co/storage/v1/object/public/assets/logo_Tailor_transparente.png";

const LOGO_OPTIONS = [
  { label: "Logo Tailor completa", value: LOGO_COMPLETA, thumb: LOGO_COMPLETA, bg: "#082537" },
  { label: "Logo Tailor transparente", value: LOGO_TRANSPARENTE, thumb: LOGO_TRANSPARENTE, bg: "#082537" },
  { label: "Sem logo", value: "__none__", thumb: null, bg: "#f3f4f6" },
];

const PERFIL_OPTIONS = ["ADMIN", "LIDER", "BANKER", "FINDER", "OPERACOES"];
const PAGINA_OPTIONS = [
  { label: "Todas as páginas", value: "__all__" },
  { label: "Dashboard Comercial", value: "/dashboards/comercial" },
  { label: "Importar Bases", value: "/admin/importar-bases" },
  { label: "Gestão de Usuários", value: "/admin/usuarios" },
];

interface PopupRow {
  id: string;
  titulo: string;
  mensagem: string;
  ativo: boolean;
  data_inicio: string | null;
  data_fim: string | null;
  perfis: string[] | null;
  destinatarios: string[] | null;
  paginas: string[] | null;
  cor_fundo: string | null;
  cor_texto: string | null;
  botao_label: string | null;
  logo_url: string | null;
  mostrar_nome_hub: boolean | null;
  created_at: string | null;
  total_dismiss?: number;
  total_views?: number;
}

type DestinatarioMode = "todos" | "perfil" | "especifico";

const defaultForm = {
  titulo: "",
  mensagem: "",
  ativo: true,
  data_inicio: new Date(),
  data_fim: null as Date | null,
  destinatario_mode: "todos" as DestinatarioMode,
  perfis: [] as string[],
  destinatarios: [] as string[],
  paginas: ["__all__"] as string[],
  logo_url: LOGO_COMPLETA as string,
  mostrar_nome_hub: true,
};

export default function GerenciarPopups() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: popups, isLoading } = useQuery({
    queryKey: ["admin-popups"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_admin_listar_popups");
      if (error) throw error;
      return (data || []) as unknown as PopupRow[];
    },
  });

  const { data: users } = useQuery({
    queryKey: ["all-profiles-emails"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("email").order("email");
      return (data || []).map((u) => u.email);
    },
  });

  const openNew = () => {
    setEditId(null);
    setForm({ ...defaultForm, data_inicio: new Date() });
    setModalOpen(true);
  };

  const openEdit = (p: PopupRow) => {
    setEditId(p.id);
    const mode: DestinatarioMode =
      p.destinatarios && p.destinatarios.length > 0 ? "especifico" :
      p.perfis && p.perfis.length > 0 ? "perfil" : "todos";
    setForm({
      titulo: p.titulo,
      mensagem: p.mensagem,
      ativo: p.ativo ?? true,
      data_inicio: p.data_inicio ? new Date(p.data_inicio) : new Date(),
      data_fim: p.data_fim ? new Date(p.data_fim) : null,
      destinatario_mode: mode,
      perfis: p.perfis || [],
      destinatarios: p.destinatarios || [],
      paginas: p.paginas && p.paginas.length > 0 ? p.paginas : ["__all__"],
      logo_url: p.logo_url || LOGO_WHITE,
      mostrar_nome_hub: p.mostrar_nome_hub ?? true,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.titulo.trim() || !form.mensagem.trim()) {
      toast.error("Título e mensagem são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        p_id: editId || null,
        p_titulo: form.titulo.trim(),
        p_mensagem: form.mensagem.trim(),
        p_ativo: form.ativo,
        p_data_inicio: form.data_inicio.toISOString(),
        p_data_fim: form.data_fim ? form.data_fim.toISOString() : null,
        p_perfis: form.destinatario_mode === "perfil" ? form.perfis : null,
        p_destinatarios: form.destinatario_mode === "especifico" ? form.destinatarios : null,
        p_paginas: form.paginas.includes("__all__") ? null : form.paginas,
        p_cor_fundo: "#082537",
        p_botao_label: "Entendido!",
        p_logo_url: form.logo_url === "__none__" ? null : form.logo_url,
        p_mostrar_nome_hub: form.mostrar_nome_hub,
      };
      const { error } = await supabase.rpc("rpc_admin_salvar_popup", payload as any);
      if (error) throw error;
      toast.success(editId ? "Comunicado atualizado!" : "Comunicado criado!");
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-popups"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.rpc("rpc_admin_excluir_popup", { p_id: deleteId } as any);
      if (error) throw error;
      toast.success("Comunicado excluído!");
      qc.invalidateQueries({ queryKey: ["admin-popups"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir");
    } finally {
      setDeleteId(null);
    }
  };

  const getStatus = (p: PopupRow) => {
    if (!p.ativo) return "Inativo";
    if (p.data_fim && new Date(p.data_fim) < new Date()) return "Expirado";
    return "Ativo";
  };

  const getStatusColor = (s: string) => {
    if (s === "Ativo") return "bg-green-100 text-green-800 border-green-200";
    if (s === "Expirado") return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-gray-100 text-gray-600 border-gray-200";
  };

  const getDestinatarioLabel = (p: PopupRow) => {
    if (p.destinatarios && p.destinatarios.length > 0) return `${p.destinatarios.length} usuário(s)`;
    if (p.perfis && p.perfis.length > 0) return p.perfis.join(", ");
    return "Todos";
  };

  const getPaginasLabel = (p: PopupRow) => {
    if (!p.paginas || p.paginas.length === 0) return "Todas";
    return p.paginas
      .map((pg) => PAGINA_OPTIONS.find((o) => o.value === pg)?.label || pg)
      .join(", ");
  };

  if (isLoading) return <AppLayout><TailorLoader /></AppLayout>;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Megaphone className="h-5 w-5" style={{ color: "#082537" }} />
            <h1 className="text-lg font-semibold" style={{ color: "#1B2A3D" }}>
              Comunicados
            </h1>
          </div>
          <Button onClick={openNew} size="sm" className="gap-1.5" style={{ backgroundColor: "#082537" }}>
            <Plus className="h-4 w-4" /> Novo Comunicado
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Destinatários</TableHead>
                  <TableHead>Páginas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-center">Dispensas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!popups || popups.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhum comunicado cadastrado.
                    </TableCell>
                  </TableRow>
                ) : popups.map((p) => {
                  const status = getStatus(p);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{p.titulo}</TableCell>
                      <TableCell className="text-xs">{getDestinatarioLabel(p)}</TableCell>
                      <TableCell className="text-xs max-w-[160px] truncate">{getPaginasLabel(p)}</TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs border", getStatusColor(status))}>{status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {p.data_inicio ? format(new Date(p.data_inicio), "dd/MM/yy") : "—"}
                        {" → "}
                        {p.data_fim ? format(new Date(p.data_fim), "dd/MM/yy") : "∞"}
                      </TableCell>
                      <TableCell className="text-center">{p.total_dismiss ?? 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(p.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Modal — Two columns */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Comunicado" : "Novo Comunicado"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT — Form */}
            <div className="space-y-5">
              {/* Content */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Conteúdo</h3>
                <div>
                  <Label>Título *</Label>
                  <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Título do comunicado" />
                </div>
                <div>
                  <Label>Mensagem *</Label>
                  <Textarea value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} placeholder="Mensagem do comunicado" rows={3} />
                </div>
              </div>

              {/* Segmentation */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Segmentação</h3>
                <div>
                  <Label>Destinatários</Label>
                  <Select value={form.destinatario_mode} onValueChange={(v) => setForm({ ...form, destinatario_mode: v as DestinatarioMode })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os usuários</SelectItem>
                      <SelectItem value="perfil">Por perfil</SelectItem>
                      <SelectItem value="especifico">Usuários específicos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.destinatario_mode === "perfil" && (
                  <div className="flex flex-wrap gap-2">
                    {PERFIL_OPTIONS.map((p) => (
                      <label key={p} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <Checkbox
                          checked={form.perfis.includes(p)}
                          onCheckedChange={(c) =>
                            setForm({ ...form, perfis: c ? [...form.perfis, p] : form.perfis.filter((x) => x !== p) })
                          }
                        />
                        {p}
                      </label>
                    ))}
                  </div>
                )}

                {form.destinatario_mode === "especifico" && (
                  <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                    {(users || []).map((email) => (
                      <label key={email} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <Checkbox
                          checked={form.destinatarios.includes(email)}
                          onCheckedChange={(c) =>
                            setForm({ ...form, destinatarios: c ? [...form.destinatarios, email] : form.destinatarios.filter((x) => x !== email) })
                          }
                        />
                        {email}
                      </label>
                    ))}
                  </div>
                )}

                <div>
                  <Label>Páginas</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {PAGINA_OPTIONS.map((pg) => (
                      <label key={pg.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <Checkbox
                          checked={form.paginas.includes(pg.value)}
                          onCheckedChange={(c) => {
                            if (pg.value === "__all__") {
                              setForm({ ...form, paginas: c ? ["__all__"] : [] });
                            } else {
                              const next = c
                                ? [...form.paginas.filter((x) => x !== "__all__"), pg.value]
                                : form.paginas.filter((x) => x !== pg.value);
                              setForm({ ...form, paginas: next.length === 0 ? ["__all__"] : next });
                            }
                          }}
                        />
                        {pg.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Period */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Período</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Data de início</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.data_inicio && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.data_inicio ? format(form.data_inicio, "dd/MM/yyyy") : "Selecionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={form.data_inicio} onSelect={(d) => d && setForm({ ...form, data_inicio: d })} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Data de fim (opcional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.data_fim && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.data_fim ? format(form.data_fim, "dd/MM/yyyy") : "Sem expiração"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={form.data_fim || undefined} onSelect={(d) => setForm({ ...form, data_fim: d || null })} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.ativo} onCheckedChange={(c) => setForm({ ...form, ativo: c })} />
                  <Label>Ativo</Label>
                </div>
              </div>

              {/* Logo selection */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Logo</h3>
                <div className="flex gap-3">
                  {LOGO_OPTIONS.map((opt) => {
                    const isSelected = form.logo_url === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm({ ...form, logo_url: opt.value })}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-lg border-2 p-2 transition-all cursor-pointer w-24",
                          isSelected ? "border-[#082537] ring-1 ring-[#082537]/30" : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div
                          className="w-full h-10 rounded flex items-center justify-center"
                          style={{ backgroundColor: opt.bg }}
                        >
                          {opt.thumb ? (
                            <img src={opt.thumb} alt={opt.label} className="h-5 object-contain" />
                          ) : (
                            <ImageOff className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground leading-tight text-center">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <Switch checked={form.mostrar_nome_hub} onCheckedChange={(c) => setForm({ ...form, mostrar_nome_hub: c })} />
                  <Label>Mostrar "Hub Grupo Tailor Partners"</Label>
                </div>
              </div>
            </div>

            {/* RIGHT — Live Preview */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pré-visualização</h3>
              <div className="rounded-xl bg-gray-100 p-4 flex items-start justify-center min-h-[400px]">
                <div className="relative w-full flex items-center justify-center pt-4">
                  <div className="absolute inset-0 bg-black/30 rounded-lg" />
                  <div className="relative z-10 w-full max-w-[340px]">
                    <PopupCard
                      titulo={form.titulo}
                      mensagem={form.mensagem}
                      logo_url={form.logo_url === "__none__" ? "" : form.logo_url}
                      mostrar_nome_hub={form.mostrar_nome_hub}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} style={{ backgroundColor: "#082537" }}>
              {saving ? "Publicando..." : "Publicar Comunicado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir comunicado?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. O comunicado e todas as dispensas serão removidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
