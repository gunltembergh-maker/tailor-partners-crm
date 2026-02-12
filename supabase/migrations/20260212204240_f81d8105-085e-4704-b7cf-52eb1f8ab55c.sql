
-- Add text reference columns to clients for name-based mapping
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS banker_name text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS finder_name text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS canal text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS advisor_name text;

-- Create team reference table for auto-assigning roles on signup
CREATE TABLE public.team_reference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  short_name text NOT NULL,
  email text,
  unit text NOT NULL, -- Banker, Finder, Advisor, Diretoria, etc.
  codigo_xp text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_reference ENABLE ROW LEVEL SECURITY;

-- Only admins/liders can manage team references
CREATE POLICY "Admins and liders can view team_reference" ON public.team_reference
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and liders can manage team_reference" ON public.team_reference
FOR ALL TO authenticated USING (is_admin_or_lider(auth.uid()));

-- Update handle_new_user to auto-assign role based on team_reference email match
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
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);

  -- Try to auto-assign role based on email match in team_reference
  SELECT unit INTO _unit FROM public.team_reference WHERE lower(email) = lower(NEW.email) LIMIT 1;
  
  IF _unit IS NOT NULL THEN
    CASE
      WHEN _unit = 'Banker' THEN _role := 'BANKER';
      WHEN _unit = 'Finder' THEN _role := 'FINDER';
      WHEN _unit = 'Advisor' THEN _role := 'ASSESSOR';
      ELSE _role := 'ASSESSOR'; -- default for other units
    END CASE;
    
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  END IF;

  RETURN NEW;
END;
$$;
