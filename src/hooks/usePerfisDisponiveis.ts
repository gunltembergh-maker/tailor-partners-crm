import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PerfilDisponivel {
  nome: string;
  descricao: string;
  ordem: number;
}

/**
 * Single source of truth para perfis de acesso disponíveis.
 * Lê de `perfis_acesso` via RPC (ativo = true), ordenado por hierarquia.
 */
export function usePerfisDisponiveis() {
  return useQuery({
    queryKey: ["perfis-disponiveis"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_listar_perfis_disponiveis");
      if (error) throw error;
      return (data || []) as PerfilDisponivel[];
    },
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
}

/**
 * Helper que devolve as opções já no formato { value, label } para Selects.
 * `BANKER` é exibido como "FINANCIAL ADVISOR" conforme padrão de UI do Hub.
 */
export function usePerfisDisponiveisOptions() {
  const { data, isLoading } = usePerfisDisponiveis();
  const options = (data || []).map((p) => ({
    value: p.nome,
    label: p.nome === "BANKER" ? "FINANCIAL ADVISOR" : p.nome,
  }));
  return { options, isLoading };
}
