import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const POLL_INTERVAL = 30_000;

export function useDashboardRefresh() {
  const queryClient = useQueryClient();
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const versionRef = useRef<number | null>(null);

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
  }, []);

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
      setTimeout(() => setIsRefreshing(false), 1000);
    });
  }

  return { lastUpdatedAt, isRefreshing };
}
