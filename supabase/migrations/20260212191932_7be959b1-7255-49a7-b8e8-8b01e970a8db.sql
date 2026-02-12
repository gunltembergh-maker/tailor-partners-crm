
-- 1. Drop existing tables (order matters for foreign keys)
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.opportunities CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- 2. Drop old enums
DROP TYPE IF EXISTS public.lead_status CASCADE;
DROP TYPE IF EXISTS public.opportunity_stage CASCADE;
DROP TYPE IF EXISTS public.task_priority CASCADE;
DROP TYPE IF EXISTS public.task_status CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

-- 3. Create new enums
CREATE TYPE public.app_role AS ENUM ('ASSESSOR', 'BANKER', 'LIDER');
CREATE TYPE public.tipo_pessoa AS ENUM ('PF', 'PJ');
CREATE TYPE public.lead_status AS ENUM ('NOVO', 'CONTATO_INICIADO', 'QUALIFICADO', 'REUNIAO', 'PROPOSTA', 'CONVERTIDO', 'PERDIDO');
CREATE TYPE public.client_status AS ENUM ('ATIVO_NET', 'INATIVO_PLD', 'CRITICO');
CREATE TYPE public.opportunity_stage AS ENUM ('INICIAL', 'EM_ANDAMENTO', 'NEGOCIACAO', 'GANHA', 'PERDIDA');
CREATE TYPE public.task_tipo AS ENUM ('LIGACAO', 'WHATSAPP', 'EMAIL', 'REUNIAO', 'POS_VENDA', 'OUTRO');
CREATE TYPE public.task_status AS ENUM ('ABERTA', 'CONCLUIDA', 'ATRASADA');
CREATE TYPE public.related_type AS ENUM ('LEAD', 'CLIENT', 'OPPORTUNITY');

-- 4. Add active to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- 5. Recreate user_roles with new enum
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'ASSESSOR',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 6. Recreate has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- 7. Update handle_new_user to use new role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'ASSESSOR');
  RETURN NEW;
END;
$$;

-- 8. Create leads table
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_pessoa tipo_pessoa NOT NULL DEFAULT 'PF',
  nome_razao text NOT NULL,
  cpf_cnpj text,
  email text,
  telefone text,
  canal_origem text DEFAULT 'Outro',
  status lead_status NOT NULL DEFAULT 'NOVO',
  valor_potencial numeric DEFAULT 0,
  segmento text,
  score integer CHECK (score >= 0 AND score <= 100),
  owner_id uuid REFERENCES auth.users(id) NOT NULL,
  banker_id uuid REFERENCES auth.users(id),
  assessor_id uuid REFERENCES auth.users(id),
  last_contact_at timestamptz,
  next_action_at timestamptz,
  conversion_at timestamptz,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 9. Create clients table
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_pessoa tipo_pessoa NOT NULL DEFAULT 'PF',
  nome_razao text NOT NULL,
  cpf_cnpj text,
  email text,
  telefone text,
  status client_status NOT NULL DEFAULT 'ATIVO_NET',
  patrimonio_ou_receita numeric DEFAULT 0,
  segmento text,
  risco_ou_alertas text,
  banker_id uuid REFERENCES auth.users(id),
  assessor_id uuid REFERENCES auth.users(id),
  last_contact_at timestamptz,
  next_action_at timestamptz,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 10. Create opportunities table
CREATE TABLE public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  origem text DEFAULT 'LEAD',
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  stage opportunity_stage NOT NULL DEFAULT 'INICIAL',
  valor_estimado numeric DEFAULT 0,
  probabilidade integer CHECK (probabilidade >= 0 AND probabilidade <= 100),
  close_date date,
  last_update_at timestamptz DEFAULT now(),
  owner_id uuid REFERENCES auth.users(id) NOT NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- 11. Create tasks table
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo task_tipo NOT NULL DEFAULT 'OUTRO',
  status task_status NOT NULL DEFAULT 'ABERTA',
  due_at timestamptz,
  done_at timestamptz,
  related_type related_type,
  related_id uuid,
  owner_id uuid REFERENCES auth.users(id) NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 12. Create notes table
CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  related_type related_type NOT NULL,
  related_id uuid NOT NULL,
  author_id uuid REFERENCES auth.users(id) NOT NULL,
  texto text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 13. Triggers for updated_at
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Trigger: on task completed, update last_contact_at + done_at
CREATE OR REPLACE FUNCTION public.on_task_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'CONCLUIDA' AND (OLD.status IS NULL OR OLD.status <> 'CONCLUIDA') THEN
    NEW.done_at = now();
    IF NEW.related_type = 'LEAD' AND NEW.related_id IS NOT NULL THEN
      UPDATE public.leads SET last_contact_at = now() WHERE id = NEW.related_id;
    ELSIF NEW.related_type = 'CLIENT' AND NEW.related_id IS NOT NULL THEN
      UPDATE public.clients SET last_contact_at = now() WHERE id = NEW.related_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_on_task_completed
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.on_task_completed();

-- 15. RLS Policies

-- user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Liders can manage roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'LIDER'));

-- leads
CREATE POLICY "Authenticated can view leads" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Authenticated can create leads" ON public.leads FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner or assigned can update leads" ON public.leads FOR UPDATE USING (
  auth.uid() = owner_id OR auth.uid() = banker_id OR auth.uid() = assessor_id OR has_role(auth.uid(), 'LIDER')
);
CREATE POLICY "Liders can delete leads" ON public.leads FOR DELETE USING (has_role(auth.uid(), 'LIDER'));

-- clients
CREATE POLICY "Authenticated can view clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Authenticated can create clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = banker_id OR auth.uid() = assessor_id OR has_role(auth.uid(), 'LIDER'));
CREATE POLICY "Owner or assigned can update clients" ON public.clients FOR UPDATE USING (
  auth.uid() = banker_id OR auth.uid() = assessor_id OR has_role(auth.uid(), 'LIDER')
);
CREATE POLICY "Liders can delete clients" ON public.clients FOR DELETE USING (has_role(auth.uid(), 'LIDER'));

-- opportunities
CREATE POLICY "Authenticated can view opportunities" ON public.opportunities FOR SELECT USING (true);
CREATE POLICY "Authenticated can create opportunities" ON public.opportunities FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can update opportunities" ON public.opportunities FOR UPDATE USING (
  auth.uid() = owner_id OR has_role(auth.uid(), 'LIDER')
);
CREATE POLICY "Liders can delete opportunities" ON public.opportunities FOR DELETE USING (has_role(auth.uid(), 'LIDER'));

-- tasks
CREATE POLICY "Authenticated can view tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Authenticated can create tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can update tasks" ON public.tasks FOR UPDATE USING (
  auth.uid() = owner_id OR has_role(auth.uid(), 'LIDER')
);
CREATE POLICY "Liders can delete tasks" ON public.tasks FOR DELETE USING (has_role(auth.uid(), 'LIDER'));

-- notes
CREATE POLICY "Authenticated can view notes" ON public.notes FOR SELECT USING (true);
CREATE POLICY "Authenticated can create notes" ON public.notes FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Author can update notes" ON public.notes FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Liders can delete notes" ON public.notes FOR DELETE USING (has_role(auth.uid(), 'LIDER'));
