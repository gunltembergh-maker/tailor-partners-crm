UPDATE public.profiles
SET active = true, tipo_usuario = 'externo'
WHERE LOWER(email) = 'alessandro.oliveira@codigoaeducacao.com.br';

INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'DIRETORIA'::app_role
FROM public.profiles
WHERE LOWER(email) = 'alessandro.oliveira@codigoaeducacao.com.br'
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;