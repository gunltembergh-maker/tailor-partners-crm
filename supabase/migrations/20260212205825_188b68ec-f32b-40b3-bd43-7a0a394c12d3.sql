
-- Update handle_new_user to auto-assign ADMIN/LIDER roles based on team_reference
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _unit text;
  _role app_role;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);

  -- Check if email exists in team_reference for auto-role assignment (Admin/Lider only)
  SELECT unit INTO _unit
  FROM public.team_reference
  WHERE lower(email) = lower(NEW.email)
  LIMIT 1;

  IF _unit IS NOT NULL THEN
    IF lower(_unit) = 'admin' THEN
      _role := 'ADMIN';
    ELSIF lower(_unit) = 'lider' THEN
      _role := 'LIDER';
    END IF;

    IF _role IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, _role);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
