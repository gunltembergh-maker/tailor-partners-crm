import { useEffect, useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const POLL_INTERVAL = 30_000;

function formatBRT(isoString: string | null): string {
  if (!isoString) return "--";
  const d = new Date(isoString);
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  const dd = brt.getUTCDate().toString().padStart(2, "0");
  const mm = (brt.getUTCMonth() + 1).toString().padStart(2, "0");
  const hh = brt.getUTCHours().toString().padStart(2, "0");
  const min = brt.getUTCMinutes().toString().padStart(2, "0");
  return `${dd}/${mm} ${hh}:${min}`;
}

export function useDashboardRefresh() {
  const queryClient = useQueryClient();
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const versionRef = useRef<number | null>(null);

  // Timestamps from rpc_dashboard_timestamps
  const [atualizadoEm, setAtualizadoEm] = useState<string | null>(null);
  const [dadosAte, setDadosAte] = useState<string | null>(null);

  const fetchTimestamps = useCallback(async () => {
    try {
      const { data } = await supabase.rpc("rpc_dashboard_timestamps" as any);
      if (data && Array.isArray(data) && data.length > 0) {
        setAtualizadoEm(data[0].atualizado_em);
        setDadosAte(data[0].dados_ate);
      } else if (data && !Array.isArray(data)) {
        setAtualizadoEm((data as any).atualizado_em);
        setDadosAte((data as any).dados_ate);
      }
    } catch {
      // silent
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("dashboard_refresh" as any)
        .select("version, updated_at")
        .eq("id", 1)
        .single();
      if (data) {
        versionRef.current = (data as any).version;
        setLastUpdatedAt((data as any).updated_at);
      }
    }
    fetch();
    fetchTimestamps();
  }, [fetchTimestamps]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-refresh-rt")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "dashboard_refresh" },
        (payload) => {
          const newVersion = (payload.new as any).version;
          const newUpdatedAt = (payload.new as any).updated_at;
          if (versionRef.current !== null && newVersion > versionRef.current) {
            versionRef.current = newVersion;
            setLastUpdatedAt(newUpdatedAt);
            triggerRefresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Polling fallback
  useEffect(() => {
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("dashboard_refresh" as any)
        .select("version, updated_at")
        .eq("id", 1)
        .single();
      if (data) {
        const newVersion = (data as any).version;
        if (versionRef.current !== null && newVersion > versionRef.current) {
          versionRef.current = newVersion;
          setLastUpdatedAt((data as any).updated_at);
          triggerRefresh();
        } else if (versionRef.current === null) {
          versionRef.current = newVersion;
          setLastUpdatedAt((data as any).updated_at);
        }
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  function triggerRefresh() {
    setIsRefreshing(true);
    queryClient.invalidateQueries().then(() => {
      fetchTimestamps();
      setTimeout(() => setIsRefreshing(false), 1000);
    });
  }

  const manualRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    try {
      await queryClient.invalidateQueries();
      await fetchTimestamps();
      toast({
        title: "Dados atualizados com sucesso",
        description: "Todas as métricas foram recarregadas.",
      });
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 800);
    }
  }, [queryClient, fetchTimestamps]);

  return {
    lastUpdatedAt,
    isRefreshing,
    isManualRefreshing,
    manualRefresh,
    atualizadoEmFormatted: formatBRT(atualizadoEm),
    dadosAteFormatted: formatBRT(dadosAte),
  };
}
