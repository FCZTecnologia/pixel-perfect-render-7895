CREATE OR REPLACE FUNCTION public.delete_unit(_unit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  PERFORM id FROM public.units WHERE id = _unit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unidade não encontrada';
  END IF;
  DELETE FROM public.notices WHERE unit_id = _unit_id;
  DELETE FROM public.units WHERE id = _unit_id;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_unit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_unit(uuid) TO authenticated;