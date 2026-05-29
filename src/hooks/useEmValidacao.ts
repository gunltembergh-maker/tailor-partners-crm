import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EmValidacaoData {
  em_validacao: boolean;
  mode: 'auto' | 'force_on' | 'force_off';
  mes_ref: string;
  mes_int: number;
  ano_int: number;
  dia_util_corrente: number;
  override_atualizado_em: string | null;
  override_atualizado_por: string | null;
}

export function useEmValidacao() {
  return useQuery({
    queryKey: ['em_validacao'],
    queryFn: async (): Promise<EmValidacaoData> => {
      const { data, error } = await supabase.rpc('rpc_get_em_validacao');
      if (error) throw error;
      return (data as unknown) as EmValidacaoData;
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
    refetchOnWindowFocus: true,
  });
}
