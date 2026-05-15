-- Granularizar permissões de Dashboards (pai + filhos Comercial e Receita)
-- Backfill compatível: quem hoje tem qualquer acesso (chaves novas OU legadas
-- menu_dashboard_comercial/menu_dashboard_receita) recebe os dois filhos e o pai.
UPDATE public.perfis_acesso
SET permissoes = permissoes
  || jsonb_build_object(
       'menu_dashboards', COALESCE(
         (permissoes->>'menu_dashboards')::boolean,
         (permissoes->>'menu_dashboards_comercial')::boolean,
         (permissoes->>'menu_dashboards_receita')::boolean,
         (permissoes->>'menu_dashboard_comercial')::boolean,
         (permissoes->>'menu_dashboard_receita')::boolean,
         false
       ),
       'menu_dashboards_comercial', COALESCE(
         (permissoes->>'menu_dashboards_comercial')::boolean,
         (permissoes->>'menu_dashboard_comercial')::boolean,
         (permissoes->>'menu_dashboards')::boolean,
         false
       ),
       'menu_dashboards_receita', COALESCE(
         (permissoes->>'menu_dashboards_receita')::boolean,
         (permissoes->>'menu_dashboard_receita')::boolean,
         (permissoes->>'menu_dashboards')::boolean,
         false
       )
     ),
    updated_at = now();