
-- =========================================================
-- PARTE 1: Cleanup permissões órfãs
-- =========================================================
UPDATE perfis_acesso
SET 
  permissoes = permissoes - 'menu_dashboard_comercial' - 'menu_dashboard_receita',
  updated_at = NOW()
WHERE permissoes ? 'menu_dashboard_comercial' 
   OR permissoes ? 'menu_dashboard_receita';

-- =========================================================
-- PARTE 3: Tabela market_news_cache
-- =========================================================
CREATE TABLE IF NOT EXISTS public.market_news_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  link text NOT NULL,
  publicado_em timestamptz NOT NULL,
  fonte text NOT NULL DEFAULT 'InfoMoney',
  capturado_em timestamptz NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_market_news_link 
  ON public.market_news_cache(link);

CREATE INDEX IF NOT EXISTS idx_market_news_publicado 
  ON public.market_news_cache(publicado_em DESC);

COMMENT ON TABLE public.market_news_cache IS 
'Cache de notícias do mercado financeiro (RSS InfoMoney mercados). Atualizado pela edge function get-market-news a cada hora.';

ALTER TABLE public.market_news_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "market_news_cache_select_all_auth" ON public.market_news_cache;
CREATE POLICY "market_news_cache_select_all_auth"
ON public.market_news_cache
FOR SELECT
TO authenticated
USING (true);

-- =========================================================
-- PARTE 5: RPC rpc_inicio_top_saldos
-- =========================================================
CREATE OR REPLACE FUNCTION public.rpc_inicio_top_saldos(p_limit int DEFAULT 5)
RETURNS TABLE(
  cliente_nome text,
  cpf_cnpj text,
  casa text,
  d0 numeric,
  d_mais_1 numeric,
  d_mais_2 numeric,
  d_mais_3 numeric,
  total_saldo numeric,
  fa text,
  advisor text,
  finder text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_bankers text[];
  v_user_finders text[];
BEGIN
  v_user_bankers := get_user_banker_filter();
  v_user_finders := get_user_finder_filter();
  
  RETURN QUERY
  SELECT 
    s.cliente_nome,
    s.cpf_cnpj,
    s.casa,
    COALESCE(s.d0, 0)::numeric AS d0,
    COALESCE(s.d_mais_1, 0)::numeric AS d_mais_1,
    COALESCE(s.d_mais_2, 0)::numeric AS d_mais_2,
    COALESCE(s.d_mais_3, 0)::numeric AS d_mais_3,
    COALESCE(s.total_saldo, 0)::numeric AS total_saldo,
    s.banker AS fa,
    s.advisor,
    s.finder
  FROM vw_saldo_consolidado s
  WHERE COALESCE(s.total_saldo, 0) > 0
    AND (v_user_bankers IS NULL OR s.banker = ANY(v_user_bankers))
    AND (v_user_finders IS NULL OR s.finder = ANY(v_user_finders))
  ORDER BY s.total_saldo DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.rpc_inicio_top_saldos IS 
'Retorna os top N saldos da carteira do usuário logado, com breakdown D0/D+1/D+2/D+3. Aplica RLS por banker e finder. Usado pela Tela de Início.';

-- =========================================================
-- PARTE 6: RPC rpc_inicio_vencimentos_proximos
-- Wrapper sobre rpc_tabela_vencimentos (sig: p_anomes int[], p_banker text[], p_documento text[], p_advisor text[], p_finder text[], p_tipo_cliente text[])
-- Retorna: documento, ativo_ajustado, net, vencimento, indexador, produto_ajustado, banker, advisor, finder, casa
-- =========================================================
CREATE OR REPLACE FUNCTION public.rpc_inicio_vencimentos_proximos(
  p_dias int DEFAULT 60,
  p_limit int DEFAULT 5
)
RETURNS TABLE(
  cliente_nome text,
  ativo text,
  data_vencimento date,
  valor numeric,
  dias_restantes int,
  banker text,
  advisor text,
  finder text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_bankers text[];
  v_user_finders text[];
BEGIN
  v_user_bankers := get_user_banker_filter();
  v_user_finders := get_user_finder_filter();
  
  RETURN QUERY
  SELECT 
    v.documento AS cliente_nome,
    v.ativo_ajustado AS ativo,
    v.vencimento AS data_vencimento,
    COALESCE(v.net, 0)::numeric AS valor,
    (v.vencimento - CURRENT_DATE)::int AS dias_restantes,
    v.banker,
    v.advisor,
    v.finder
  FROM rpc_tabela_vencimentos(
    NULL::int[],
    v_user_bankers,
    NULL::text[],
    NULL::text[],
    v_user_finders,
    NULL::text[]
  ) v
  WHERE v.vencimento IS NOT NULL
    AND v.vencimento BETWEEN CURRENT_DATE AND (CURRENT_DATE + p_dias)
  ORDER BY v.vencimento ASC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.rpc_inicio_vencimentos_proximos IS 
'Retorna os próximos N vencimentos da carteira do usuário, dentro de p_dias. Wrapper sobre rpc_tabela_vencimentos com filtros temporal e LIMIT.';

-- =========================================================
-- PARTE 7: RPC rpc_inicio_mural
-- admin_popups real cols: titulo, mensagem, data_inicio, data_fim, ativo, perfis, cor_fundo
-- =========================================================
CREATE OR REPLACE FUNCTION public.rpc_inicio_mural(p_limit int DEFAULT 10)
RETURNS TABLE(
  tipo text,
  titulo text,
  conteudo text,
  publicado_em timestamptz,
  link text,
  icone text,
  cor text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_role text;
BEGIN
  SELECT role::text INTO v_user_role
  FROM user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN QUERY
  SELECT 
    'comunicado'::text AS tipo,
    p.titulo,
    LEFT(COALESCE(p.mensagem, ''), 300) AS conteudo,
    p.data_inicio AS publicado_em,
    NULL::text AS link,
    '📢'::text AS icone,
    COALESCE(p.cor_fundo, '#0A2337')::text AS cor
  FROM admin_popups p
  WHERE p.ativo = true
    AND (p.data_inicio IS NULL OR p.data_inicio <= NOW())
    AND (p.data_fim IS NULL OR p.data_fim >= NOW())
    AND (
      p.perfis IS NULL 
      OR array_length(p.perfis, 1) IS NULL
      OR v_user_role = ANY(p.perfis)
    )
  
  UNION ALL
  
  SELECT 
    'noticia'::text,
    n.titulo,
    LEFT(COALESCE(n.descricao, ''), 300),
    n.publicado_em,
    n.link,
    '📰'::text,
    '#4B6D88'::text
  FROM market_news_cache n
  WHERE n.publicado_em >= NOW() - INTERVAL '7 days'
  
  ORDER BY publicado_em DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.rpc_inicio_mural IS 
'Mural da Tela de Início. Junta comunicados ativos do admin + notícias do mercado (últimos 7 dias). Respeita segmentação por perfil.';

-- =========================================================
-- CRON: sync-market-news a cada hora cheia
-- =========================================================
SELECT cron.unschedule('sync-market-news') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-market-news'
);

SELECT cron.schedule(
  'sync-market-news',
  '0 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://jtlelokzpqkgvlwomfus.supabase.co/functions/v1/get-market-news',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $cron$
);
