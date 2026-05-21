DELETE FROM public.user_roles WHERE user_id IN (SELECT user_id FROM public.profiles WHERE LOWER(email) = 'alessandro.oliveira@codigoaeducacao.com.br');
DELETE FROM public.profiles WHERE LOWER(email) = 'alessandro.oliveira@codigoaeducacao.com.br';
DELETE FROM auth.users WHERE LOWER(email) = 'alessandro.oliveira@codigoaeducacao.com.br';
DELETE FROM public.convites_externos WHERE LOWER(email) = 'alessandro.oliveira@codigoaeducacao.com.br';
DELETE FROM public.email_unsubscribe_tokens WHERE LOWER(email) = 'alessandro.oliveira@codigoaeducacao.com.br';