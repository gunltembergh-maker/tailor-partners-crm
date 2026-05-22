import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trash2, Search, AlertTriangle, Loader2 } from "lucide-react";

type TipoVinculo = "FA" | "FINDER" | "ADVISOR";

interface Vinculo {
  id: string;
  tipo: TipoVinculo;
  valor: string;
}

const LABEL_TIPO: Record<TipoVinculo, string> = {
  FA: "Financial Advisor",
  FINDER: "Finder",
  ADVISOR: "Advisor",
};

interface Props {
  userId: string;
}

export function VinculosReceita({ userId }: Props) {
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [novoTipo, setNovoTipo] = useState<TipoVinculo>("FA");
  const [busca, setBusca] = useState("");
  const [opcoes, setOpcoes] = useState<string[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [adicionando, setAdicionando] = useState(false);

  const carregarVinculos = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await supabase.rpc("rpc_listar_vinculos_usuario" as any, {
      p_user_id: userId,
    });
    if (error) {
      toast.error(`Erro ao carregar vínculos: ${error.message}`);
      setVinculos([]);
    } else {
      setVinculos((data ?? []) as Vinculo[]);
    }
    setCarregando(false);
  }, [userId]);

  useEffect(() => {
    if (userId) carregarVinculos();
  }, [userId, carregarVinculos]);

  // Autocomplete com debounce 300ms
  useEffect(() => {
    if (!busca || busca.length < 2) {
      setOpcoes([]);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    const timer = setTimeout(async () => {
      const { data, error } = await supabase.rpc("rpc_buscar_pessoas_raw" as any, {
        p_tipo: novoTipo,
        p_busca: busca,
      });
      if (!error && Array.isArray(data)) {
        setOpcoes((data as any[]).map((d) => d.valor).filter(Boolean));
      } else {
        setOpcoes([]);
      }
      setBuscando(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [busca, novoTipo]);

  const adicionar = async (valor: string) => {
    setAdicionando(true);
    const { error } = await supabase.rpc("rpc_adicionar_vinculo" as any, {
      p_user_id: userId,
      p_tipo: novoTipo,
      p_nome_pessoa: valor,
    });
    if (error) {
      toast.error(`Erro: ${error.message}`);
    } else {
      toast.success("Vínculo adicionado");
      setBusca("");
      setOpcoes([]);
      await carregarVinculos();
    }
    setAdicionando(false);
  };

  const remover = async (vinculoId: string) => {
    const { error } = await supabase.rpc("rpc_remover_vinculo" as any, {
      p_id: vinculoId,
    });
    if (error) {
      toast.error(`Erro ao remover: ${error.message}`);
    } else {
      toast.success("Vínculo removido");
      await carregarVinculos();
    }
  };

  return (
    <div className="space-y-3 rounded-md border p-4 bg-muted/30">
      <div>
        <h4 className="text-sm font-semibold">Vínculos de Receita</h4>
        <p className="text-xs text-muted-foreground">
          Defina quais FAs, Finders ou Advisors este usuário pode ver na Receita.
          Sem vínculos, este usuário não verá nenhum dado de Receita.
        </p>
      </div>

      {carregando ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
        </div>
      ) : vinculos.length === 0 ? (
        <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-sm">Sem vínculos cadastrados</AlertTitle>
          <AlertDescription className="text-xs">
            Adicione ao menos 1 vínculo abaixo para este usuário ver dados de Receita.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-1.5">
          {vinculos.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-1.5"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="secondary" className="shrink-0">{LABEL_TIPO[v.tipo] ?? v.tipo}</Badge>
                <span className="text-sm truncate">{v.valor}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => remover(v.id)}
                className="text-destructive hover:text-destructive h-7 w-7 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 pt-2 border-t">
        <Label className="text-xs">Adicionar novo vínculo</Label>
        <div className="flex gap-2">
          <Select value={novoTipo} onValueChange={(v) => { setNovoTipo(v as TipoVinculo); setBusca(""); setOpcoes([]); }}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FA">Financial Advisor</SelectItem>
              <SelectItem value="FINDER">Finder</SelectItem>
              <SelectItem value="ADVISOR">Advisor</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Digite ao menos 2 caracteres..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-8 h-9"
              disabled={adicionando}
            />
            {(opcoes.length > 0 || (busca.length >= 2 && buscando)) && (
              <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-56 overflow-auto">
                {buscando && opcoes.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Buscando...</div>
                ) : (
                  opcoes.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => adicionar(opt)}
                      disabled={adicionando}
                      className="block w-full text-left px-3 py-2 hover:bg-muted text-sm disabled:opacity-50"
                    >
                      {opt}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        {busca.length >= 2 && !buscando && opcoes.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum resultado encontrado para "{busca}".</p>
        )}
      </div>
    </div>
  );
}
