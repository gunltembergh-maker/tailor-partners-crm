import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmValidacao } from "@/hooks/useEmValidacao";
import { DadosEmValidacaoBadge } from "@/components/shared/DadosEmValidacaoBadge";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, Clock } from "lucide-react";

type Mode = "auto" | "force_on" | "force_off";

export default function Configuracoes() {
  const { data, isLoading } = useEmValidacao();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (mode: Mode) => {
      const { data: res, error } = await supabase.rpc("rpc_set_em_validacao_override" as any, {
        p_mode: mode,
      });
      if (error) throw error;
      const r = res as any;
      if (r && r.success === false) throw new Error(r.error || "Erro desconhecido");
      return r;
    },
    onSuccess: () => {
      toast.success("Configuração atualizada");
      queryClient.invalidateQueries({ queryKey: ["em_validacao"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao atualizar configuração");
    },
  });

  const currentMode: Mode = (data?.mode as Mode) || "auto";
  const isEmValidacao = data?.em_validacao || false;

  return (
    <AppLayout>
      <div className="container mx-auto max-w-4xl p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground">Controles administrativos globais do Hub</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle>Dados em Validação</CardTitle>
                <CardDescription>
                  Controla a exibição do badge "Dados em validação" nos cards de Receita do Hub e na newsletter por email.
                </CardDescription>
              </div>
              {isEmValidacao && (
                <Badge variant="outline" className="flex items-center gap-1.5 border-amber-300 bg-amber-50 text-amber-800">
                  <AlertCircle size={12} />
                  Ativo agora
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <RadioGroup
                value={currentMode}
                onValueChange={(v) => mutation.mutate(v as Mode)}
                disabled={mutation.isPending}
                className="space-y-3"
              >
                {[
                  {
                    value: "auto" as Mode,
                    title: "Automático (recomendado)",
                    desc: 'Mostra "Dados em validação" automaticamente até o 5º dia útil de cada mês. Após o 5º DU, esconde.',
                  },
                  {
                    value: "force_on" as Mode,
                    title: "Forçar exibição",
                    desc: "Mostra o badge em todas as telas, independente da data. Use quando dados estão sendo revisados manualmente.",
                  },
                  {
                    value: "force_off" as Mode,
                    title: "Esconder sempre",
                    desc: "Nunca mostra o badge. Use apenas se a regra automática não estiver apropriada e os dados estão validados.",
                  },
                ].map((opt) => (
                  <Label
                    key={opt.value}
                    htmlFor={opt.value}
                    className="flex items-start gap-3 rounded-md border p-4 cursor-pointer hover:bg-muted/40"
                  >
                    <RadioGroupItem value={opt.value} id={opt.value} className="mt-1" />
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{opt.title}</p>
                      <p className="text-sm text-muted-foreground font-normal">{opt.desc}</p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            )}

            {data && (
              <div className="space-y-2 rounded-md bg-muted/40 p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock size={14} />
                  <span>
                    Mês de referência: <strong>{data.mes_ref}</strong> · Dia útil corrente:{" "}
                    <strong>{data.dia_util_corrente}</strong>
                  </span>
                </div>
                {data.override_atualizado_em && (
                  <div className="flex items-center gap-2">
                    <Clock size={14} />
                    <span>
                      Última alteração:{" "}
                      <strong>
                        {format(new Date(data.override_atualizado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-md border border-dashed p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Preview do badge
              </p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground">Receita Bruta Tailor</span>
                {isEmValidacao ? (
                  <DadosEmValidacaoBadge variant="card-header" />
                ) : (
                  <span className="text-xs text-muted-foreground italic">badge oculto</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
