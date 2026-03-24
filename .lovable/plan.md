

# Link Admin Profile to Your Account

## Problem
Your account (`alessandro.oliveira@tailorpartners.com.br`) already has `role = ADMIN` in `user_roles`, but the `profiles.perfil_id` column is `NULL`. This means `rpc_meu_perfil` may not return the ADMIN permissions object, causing the sidebar to hide admin menu items.

## Solution
Run a single SQL migration to set your `perfil_id` to the ADMIN profile (`26743be4-74fd-4d40-bee9-1fcc8b36d09c`).

```sql
UPDATE profiles
SET perfil_id = '26743be4-74fd-4d40-bee9-1fcc8b36d09c'
WHERE user_id = 'dc86de18-eb57-4d4d-af67-627a0f4dfe84';
```

No code changes needed. After this migration, log out and log back in to reload your permissions.

