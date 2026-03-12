import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { useSyncLogs } from "@/hooks/useDashboardData";
import { format } from "date-fns";

const sourceLabels: Record<string, string> = {
  captacao_total: "Captação",
  contas_total: "Contas",
  base_crm: "Base CRM",
  depara: "DePara",
  diversificador_consolidado: "Diversificador",
  positivador_total_agrupado: "Positivador",
  comissoes_historico: "Receita Hist.",
  comissoes_m0: "Receita M0",
  consolidado_receita: "Consolidado",
  ordem_pl: "Ordem PL",
};

export function LastUpdateBadges() {
  const { data: logs, isLoading } = useSyncLogs();

  if (isLoading) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
      {(logs ?? []).map((log: any) => (
        <Badge key={log.source_key} variant="secondary" className="text-[10px] font-normal gap-1">
          {sourceLabels[log.source_key] || log.source_key}
          {": "}
          {log.received_at ? format(new Date(log.received_at), "dd/MM HH:mm") : "—"}
          {log.status === "error" && " ⚠"}
        </Badge>
      ))}
    </div>
  );
}
