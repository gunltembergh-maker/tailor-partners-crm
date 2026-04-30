ALTER TABLE public.admin_popups DROP CONSTRAINT IF EXISTS admin_popups_criado_por_fkey;

UPDATE public.admin_popups
SET criado_por = NULL
WHERE criado_por IS NOT NULL
  AND criado_por NOT IN (SELECT user_id FROM public.profiles WHERE user_id IS NOT NULL);

ALTER TABLE public.admin_popups
  ADD CONSTRAINT admin_popups_criado_por_fkey
  FOREIGN KEY (criado_por) REFERENCES public.profiles(user_id) ON DELETE SET NULL;