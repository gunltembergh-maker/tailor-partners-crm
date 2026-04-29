UPDATE public.perfis_acesso
SET permissoes = permissoes || jsonb_build_object(
      'menu_importar_bases', false,
      'menu_importar_saldo_xp', true,
      'menu_importar_saldo_avenue', true
    ),
    updated_at = now()
WHERE nome = 'FA ASSISTENTE';