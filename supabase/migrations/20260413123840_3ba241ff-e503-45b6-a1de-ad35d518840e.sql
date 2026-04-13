
-- Drop the old overloads (without p_finder, and with p_finder in different position)
DROP FUNCTION IF EXISTS public.rpc_receita_drilldown(integer[], text[], text, text, text);
DROP FUNCTION IF EXISTS public.rpc_receita_drilldown(integer[], text[], text, text, text, text[]);
