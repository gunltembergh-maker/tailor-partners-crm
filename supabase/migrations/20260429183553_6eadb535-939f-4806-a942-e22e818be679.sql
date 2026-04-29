-- Backfill: ensure every perfil has the two new child keys
UPDATE public.perfis_acesso
SET permissoes = permissoes
  || jsonb_build_object(
       'menu_importar_saldo_xp',
       COALESCE((permissoes->>'menu_importar_bases')::boolean, false),
       'menu_importar_saldo_avenue',
       COALESCE((permissoes->>'menu_importar_bases')::boolean, false)
     ),
    updated_at = now();

-- FA ASSISTENTE: ensure parent + both children are true
UPDATE public.perfis_acesso
SET permissoes = permissoes || jsonb_build_object(
      'menu_importar_bases', true,
      'menu_importar_saldo_xp', true,
      'menu_importar_saldo_avenue', true
    ),
    updated_at = now()
WHERE nome = 'FA ASSISTENTE';