
-- Create is_admin_or_lider helper function
CREATE OR REPLACE FUNCTION public.is_admin_or_lider(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('LIDER', 'ADMIN')
  )
$$;

-- Update SELECT policies
DROP POLICY IF EXISTS "Authenticated can view leads" ON public.leads;
CREATE POLICY "Authenticated can view leads" ON public.leads
FOR SELECT TO authenticated
USING (is_admin_or_lider(auth.uid()) OR auth.uid() = owner_id OR auth.uid() = banker_id OR auth.uid() = assessor_id);

DROP POLICY IF EXISTS "Authenticated can view clients" ON public.clients;
CREATE POLICY "Authenticated can view clients" ON public.clients
FOR SELECT TO authenticated
USING (is_admin_or_lider(auth.uid()) OR auth.uid() = banker_id OR auth.uid() = assessor_id);

DROP POLICY IF EXISTS "Authenticated can view opportunities" ON public.opportunities;
CREATE POLICY "Authenticated can view opportunities" ON public.opportunities
FOR SELECT TO authenticated
USING (is_admin_or_lider(auth.uid()) OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "Authenticated can view tasks" ON public.tasks;
CREATE POLICY "Authenticated can view tasks" ON public.tasks
FOR SELECT TO authenticated
USING (is_admin_or_lider(auth.uid()) OR auth.uid() = owner_id);

-- ADMIN policy on user_roles
CREATE POLICY "Admins can manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'));

-- Update handle_new_user (no default role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$;

-- Update DELETE policies to include ADMIN
DROP POLICY IF EXISTS "Liders can delete leads" ON public.leads;
CREATE POLICY "Liders or admins can delete leads" ON public.leads
FOR DELETE TO authenticated USING (is_admin_or_lider(auth.uid()));

DROP POLICY IF EXISTS "Liders can delete clients" ON public.clients;
CREATE POLICY "Liders or admins can delete clients" ON public.clients
FOR DELETE TO authenticated USING (is_admin_or_lider(auth.uid()));

DROP POLICY IF EXISTS "Liders can delete opportunities" ON public.opportunities;
CREATE POLICY "Liders or admins can delete opportunities" ON public.opportunities
FOR DELETE TO authenticated USING (is_admin_or_lider(auth.uid()));

DROP POLICY IF EXISTS "Liders can delete tasks" ON public.tasks;
CREATE POLICY "Liders or admins can delete tasks" ON public.tasks
FOR DELETE TO authenticated USING (is_admin_or_lider(auth.uid()));

DROP POLICY IF EXISTS "Liders can delete notes" ON public.notes;
CREATE POLICY "Liders or admins can delete notes" ON public.notes
FOR DELETE TO authenticated USING (is_admin_or_lider(auth.uid()));

-- Update UPDATE policies to include ADMIN
DROP POLICY IF EXISTS "Owner or assigned can update leads" ON public.leads;
CREATE POLICY "Owner or assigned can update leads" ON public.leads
FOR UPDATE TO authenticated
USING (auth.uid() = owner_id OR auth.uid() = banker_id OR auth.uid() = assessor_id OR is_admin_or_lider(auth.uid()));

DROP POLICY IF EXISTS "Owner or assigned can update clients" ON public.clients;
CREATE POLICY "Owner or assigned can update clients" ON public.clients
FOR UPDATE TO authenticated
USING (auth.uid() = banker_id OR auth.uid() = assessor_id OR is_admin_or_lider(auth.uid()));

DROP POLICY IF EXISTS "Owner can update opportunities" ON public.opportunities;
CREATE POLICY "Owner can update opportunities" ON public.opportunities
FOR UPDATE TO authenticated
USING (auth.uid() = owner_id OR is_admin_or_lider(auth.uid()));

DROP POLICY IF EXISTS "Owner can update tasks" ON public.tasks;
CREATE POLICY "Owner can update tasks" ON public.tasks
FOR UPDATE TO authenticated
USING (auth.uid() = owner_id OR is_admin_or_lider(auth.uid()));

-- Update INSERT policy on clients
DROP POLICY IF EXISTS "Authenticated can create clients" ON public.clients;
CREATE POLICY "Authenticated can create clients" ON public.clients
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = banker_id OR auth.uid() = assessor_id OR is_admin_or_lider(auth.uid()));
