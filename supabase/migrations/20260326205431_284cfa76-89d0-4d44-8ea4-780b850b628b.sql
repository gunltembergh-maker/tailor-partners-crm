
CREATE OR REPLACE FUNCTION public.rpc_validar_dominio(p_email text)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_dominio text;
  v_empresa text;
BEGIN
  v_dominio := split_part(p_email, '@', 2);
  
  SELECT empresa INTO v_empresa
  FROM dominio_empresa
  WHERE dominio = v_dominio;
  
  IF v_empresa IS NOT NULL THEN
    RETURN json_build_object('autorizado', true, 'empresa', v_empresa);
  ELSE
    RETURN json_build_object('autorizado', false, 'empresa', null);
  END IF;
END;
$function$;
