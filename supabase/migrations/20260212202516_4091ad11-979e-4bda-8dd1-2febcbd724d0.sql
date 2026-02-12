
-- Add new enum values (must be committed separately before use)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'FINDER';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ADMIN';
