CREATE OR REPLACE FUNCTION public.block_consumption_on_terminated()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.units WHERE id = NEW.unit_id AND terminated_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Unidade encerrada: não é possível lançar consumo';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER consumption_block_terminated BEFORE INSERT OR UPDATE ON public.consumption
FOR EACH ROW EXECUTE FUNCTION public.block_consumption_on_terminated();