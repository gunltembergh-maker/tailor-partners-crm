import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MessageSquare, Paperclip, ClipboardList, FileText } from "lucide-react";
import { formatDateTime, taskTipoLabels, taskStatusLabels, taskStatusColors } from "@/lib/format";

interface DetailLayoutProps {
  title: string;
  subtitle?: string;
  relatedType: "LEAD" | "CLIENT" | "OPPORTUNITY";
  relatedId: string;
  backTo: string;
  resumo: ReactNode;
}

export function DetailLayout({ title, subtitle, relatedType, relatedId, backTo, resumo }: DetailLayoutProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadNotes();
    loadTasks();
  }, [relatedId]);

  async function loadNotes() {
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("related_type", relatedType)
      .eq("related_id", relatedId)
      .order("created_at", { ascending: false });
    setNotes(data || []);
  }

  async function loadTasks() {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("related_type", relatedType)
      .eq("related_id", relatedId)
      .order("due_at", { ascending: true });
    setTasks(data || []);
  }

  async function addNote() {
    if (!newNote.trim() || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from("notes").insert({
      texto: newNote.trim(),
      related_type: relatedType,
      related_id: relatedId,
      author_id: user.id,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setNewNote("");
      loadNotes();
    }
    setSubmitting(false);
  }

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(backTo)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>

        <Tabs defaultValue="resumo">
          <TabsList className="mb-4">
            <TabsTrigger value="resumo" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />Resumo
            </TabsTrigger>
            <TabsTrigger value="atividades" className="gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" />Atividades
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />Histórico
            </TabsTrigger>
            <TabsTrigger value="anexos" className="gap-1.5">
              <Paperclip className="h-3.5 w-3.5" />Anexos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resumo">{resumo}</TabsContent>

          <TabsContent value="atividades">
            <div className="space-y-3">
              {tasks.length === 0 && (
                <Card className="p-6 text-center text-muted-foreground">Nenhuma tarefa vinculada.</Card>
              )}
              {tasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{task.descricao || taskTipoLabels[task.tipo]}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.due_at ? `Vence: ${formatDateTime(task.due_at)}` : "Sem prazo"}
                      </p>
                    </div>
                    <Badge variant="secondary" className={taskStatusColors[task.status]}>
                      {taskStatusLabels[task.status]}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="historico">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Adicionar nota..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button onClick={addNote} disabled={submitting || !newNote.trim()} className="self-end">
                  Salvar
                </Button>
              </div>

              {notes.length === 0 && (
                <p className="text-center text-muted-foreground py-4">Nenhuma nota registrada.</p>
              )}

              <div className="relative pl-6 border-l-2 border-border space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className="relative">
                    <div className="absolute -left-[1.55rem] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{note.texto}</p>
                        <p className="text-xs text-muted-foreground mt-2">{formatDateTime(note.created_at)}</p>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="anexos">
            <Card className="p-8 text-center text-muted-foreground">
              <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>Funcionalidade de anexos em breve.</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
