
-- Fix: Replace composite UNIQUE(user_id, role) with UNIQUE(user_id) 
-- so ON CONFLICT(user_id) works in handle_new_user trigger and RPCs
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_unique ON public.user_roles (user_id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_unique UNIQUE USING INDEX user_roles_user_id_unique;
