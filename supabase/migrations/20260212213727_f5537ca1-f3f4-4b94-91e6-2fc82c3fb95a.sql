
-- Add finder_id to clients for RLS filtering
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS finder_id uuid;

-- Update RLS SELECT policy to include finder
DROP POLICY IF EXISTS "Authenticated can view clients" ON public.clients;
CREATE POLICY "Authenticated can view clients" ON public.clients
FOR SELECT USING (
  is_admin_or_lider(auth.uid()) 
  OR auth.uid() = banker_id 
  OR auth.uid() = assessor_id 
  OR auth.uid() = finder_id
);

-- Update RLS UPDATE policy to include finder
DROP POLICY IF EXISTS "Owner or assigned can update clients" ON public.clients;
CREATE POLICY "Owner or assigned can update clients" ON public.clients
FOR UPDATE USING (
  auth.uid() = banker_id 
  OR auth.uid() = assessor_id 
  OR auth.uid() = finder_id
  OR is_admin_or_lider(auth.uid())
);

-- Update RLS INSERT policy to include finder
DROP POLICY IF EXISTS "Authenticated can create clients" ON public.clients;
CREATE POLICY "Authenticated can create clients" ON public.clients
FOR INSERT WITH CHECK (
  auth.uid() = banker_id 
  OR auth.uid() = assessor_id 
  OR auth.uid() = finder_id
  OR is_admin_or_lider(auth.uid())
);

-- Add finder_id to leads for RLS filtering
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS finder_id uuid;

-- Update leads RLS SELECT to include finder
DROP POLICY IF EXISTS "Authenticated can view leads" ON public.leads;
CREATE POLICY "Authenticated can view leads" ON public.leads
FOR SELECT USING (
  is_admin_or_lider(auth.uid()) 
  OR auth.uid() = owner_id 
  OR auth.uid() = banker_id 
  OR auth.uid() = assessor_id
  OR auth.uid() = finder_id
);

-- Update leads RLS UPDATE to include finder
DROP POLICY IF EXISTS "Owner or assigned can update leads" ON public.leads;
CREATE POLICY "Owner or assigned can update leads" ON public.leads
FOR UPDATE USING (
  auth.uid() = owner_id 
  OR auth.uid() = banker_id 
  OR auth.uid() = assessor_id 
  OR auth.uid() = finder_id
  OR is_admin_or_lider(auth.uid())
);
