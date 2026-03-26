
-- Fix: view_diversificador has security_invoker=true which causes Banker users
-- to get zero rows because the underlying raw_diversificador_consolidado table
-- has RLS restricting SELECT to admin/lider only.
-- The RPCs that use this view are SECURITY DEFINER and already apply proper
-- banker filtering via get_user_banker_filter(), so it's safe to disable
-- security_invoker on the view.

ALTER VIEW public.view_diversificador SET (security_invoker = false);
