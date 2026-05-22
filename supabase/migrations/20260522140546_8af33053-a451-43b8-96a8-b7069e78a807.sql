-- 1) Backfill profiles.primeiro_acesso e ultimo_acesso para quem já logou
UPDATE public.profiles p
SET primeiro_acesso = false,
    ultimo_acesso = GREATEST(COALESCE(p.ultimo_acesso, 'epoch'::timestamptz), u.last_sign_in_at),
    updated_at = now()
FROM auth.users u
WHERE p.user_id = u.id
  AND u.last_sign_in_at IS NOT NULL
  AND (p.primeiro_acesso = true
       OR p.ultimo_acesso IS NULL
       OR p.ultimo_acesso < u.last_sign_in_at);

-- 2) Backfill team_reference.convite_status = 'aceito' para quem já logou
UPDATE public.team_reference tr
SET convite_status = 'aceito',
    convite_aceito_em = COALESCE(tr.convite_aceito_em, u.last_sign_in_at)
FROM auth.users u
WHERE LOWER(TRIM(tr.email)) = LOWER(TRIM(u.email))
  AND u.last_sign_in_at IS NOT NULL
  AND COALESCE(tr.convite_status, '') <> 'aceito';

-- 3) Atualiza a trigger de login para também marcar convite como aceito
CREATE OR REPLACE FUNCTION public.handle_user_signed_in()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.last_sign_in_at IS NOT NULL
     AND (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at) THEN
    UPDATE public.profiles
       SET active = CASE WHEN COALESCE(blocked, false) THEN active ELSE true END,
           primeiro_acesso = false,
           ultimo_acesso = NEW.last_sign_in_at,
           updated_at = now()
     WHERE user_id = NEW.id;

    UPDATE public.team_reference
       SET convite_status = 'aceito',
           convite_aceito_em = COALESCE(convite_aceito_em, NEW.last_sign_in_at)
     WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
       AND COALESCE(convite_status, '') <> 'aceito';
  END IF;
  RETURN NEW;
END;
$$;