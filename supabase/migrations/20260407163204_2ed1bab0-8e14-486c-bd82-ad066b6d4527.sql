
ALTER TABLE admin_popups ADD COLUMN IF NOT EXISTS logo_url text DEFAULT NULL;
ALTER TABLE admin_popups ADD COLUMN IF NOT EXISTS mostrar_nome_hub boolean DEFAULT true;
