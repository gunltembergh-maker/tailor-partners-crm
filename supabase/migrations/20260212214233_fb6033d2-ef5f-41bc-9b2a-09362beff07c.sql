
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS codigo_xp text,
  ADD COLUMN IF NOT EXISTS pl_declarado numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS perfil text,
  ADD COLUMN IF NOT EXISTS nascimento text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS estado_civil text,
  ADD COLUMN IF NOT EXISTS tag text,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS sow text,
  ADD COLUMN IF NOT EXISTS casa text;
