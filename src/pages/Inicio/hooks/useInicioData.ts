import { useQueries, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function rpc<T>(fn: string, args: any = {}): Promise<T[]> {
  const { data, error } = await supabase.rpc(fn as any, args);
  if (error) {
    console.warn(`[useInicioData] ${fn} error:`, error.message);
    return [];
  }
  return (Array.isArray(data) ? data : data ? [data] : []) as T[];
}

export function useInicioData() {
  const queryClient = useQueryClient();

  const queries = useQueries({
    queries: [
      {
        queryKey: ["inicio-top-saldos"],
        queryFn: () => rpc<any>("rpc_inicio_top_saldos", { p_limit: 5 }),
        staleTime: 60_000,
      },
      {
        queryKey: ["inicio-vencimentos"],
        queryFn: () => rpc<any>("rpc_inicio_vencimentos_proximos", { p_dias: 60, p_limit: 5 }),
        staleTime: 60_000,
      },
      {
        queryKey: ["inicio-mural"],
        queryFn: () => rpc<any>("rpc_inicio_mural", { p_limit: 8 }),
        staleTime: 60_000,
      },
      {
        queryKey: ["inicio-timestamps"],
        queryFn: () => rpc<any>("rpc_dashboard_timestamps"),
        staleTime: 60_000,
      },
    ],
  });

  const [topSaldosQ, vencimentosQ, muralQ, timestampsQ] = queries;

  return {
    data: {
      topSaldos: (topSaldosQ.data ?? []) as any[],
      vencimentos: (vencimentosQ.data ?? []) as any[],
      mural: (muralQ.data ?? []) as any[],
      timestamps: (timestampsQ.data ?? []) as any[],
    },
    isLoading: queries.some((q) => q.isLoading),
    isFetching: queries.some((q) => q.isFetching),
    lastUpdated: new Date(),
    refetch: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inicio-top-saldos"] }),
        queryClient.invalidateQueries({ queryKey: ["inicio-vencimentos"] }),
        queryClient.invalidateQueries({ queryKey: ["inicio-mural"] }),
        queryClient.invalidateQueries({ queryKey: ["inicio-timestamps"] }),
      ]);
    },
  };
}
