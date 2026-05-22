-- Backfill: ensure all users that already signed in are marked active
UPDATE public.profiles p
SET active = true, updated_at = now()
FROM auth.users u
WHERE p.user_id = u.id
  AND u.last_sign_in_at IS NOT NULL
  AND p.active = false
  AND COALESCE(p.blocked, false) = false;

-- Trigger to auto-activate profile on first sign-in (auth.users.last_sign_in_at update)
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
       SET active = CASE WHEN COALESCE(blocked,false) THEN active ELSE true END,
           primeiro_acesso = false,
           ultimo_acesso = NEW.last_sign_in_at,
           updated_at = now()
     WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_signed_in ON auth.users;
CREATE TRIGGER on_auth_user_signed_in
AFTER UPDATE OF last_sign_in_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_user_signed_in();