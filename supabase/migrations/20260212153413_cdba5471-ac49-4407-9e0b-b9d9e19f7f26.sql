
-- Fix UPDATE policies to be more specific (assigned_to or created_by can update)
DROP POLICY "Authenticated users can update leads" ON public.leads;
CREATE POLICY "Authenticated users can update leads" ON public.leads FOR UPDATE TO authenticated 
USING (auth.uid() = created_by OR auth.uid() = assigned_to OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'));

DROP POLICY "Authenticated users can update clients" ON public.clients;
CREATE POLICY "Authenticated users can update clients" ON public.clients FOR UPDATE TO authenticated 
USING (auth.uid() = created_by OR auth.uid() = assigned_to OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'));

DROP POLICY "Authenticated users can update opportunities" ON public.opportunities;
CREATE POLICY "Authenticated users can update opportunities" ON public.opportunities FOR UPDATE TO authenticated 
USING (auth.uid() = created_by OR auth.uid() = assigned_to OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'));

DROP POLICY "Authenticated users can update tasks" ON public.tasks;
CREATE POLICY "Authenticated users can update tasks" ON public.tasks FOR UPDATE TO authenticated 
USING (auth.uid() = created_by OR auth.uid() = assigned_to OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'));
