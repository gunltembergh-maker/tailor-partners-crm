import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { useSyncLogs } from "@/hooks/useDashboardData";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

  if (isLoading || !logs?.length) return null;

  const latest = logs.reduce((a: any, b: any) =>
    new Date(a.received_at) > new Date(b.received_at) ? a : b
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
          <Clock className="h-3 w-3" />
          <span>Atualizado {latest.received_at ? format(new Date(latest.received_at), "dd/MM HH:mm") : "—"}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Última atualização por base</p>
        <div className="space-y-1">
          {logs.map((log: any) => (
            <div key={log.source_key} className="flex items-center justify-between text-[10px]">
              <span className="text-foreground">{sourceLabels[log.source_key] || log.source_key}</span>
              <span className="text-muted-foreground">
                {log.received_at ? format(new Date(log.received_at), "dd/MM HH:mm") : "—"}
                {log.status === "error" && " ⚠"}
              </span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
