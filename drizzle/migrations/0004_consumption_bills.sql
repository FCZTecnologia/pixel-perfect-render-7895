CREATE TYPE public.utility_kind AS ENUM ('energia','agua','climatizacao');
CREATE TABLE public.consumption_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  reference_month date NOT NULL,
  kind public.utility_kind NOT NULL,
  reading_prev numeric NOT NULL DEFAULT 0,
  reading_curr numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  attachment_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unit_id, reference_month, kind)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consumption_bills TO authenticated;
GRANT ALL ON public.consumption_bills TO service_role;
ALTER TABLE public.consumption_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all bills" ON public.consumption_bills FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "tenant reads own bills" ON public.consumption_bills FOR SELECT TO authenticated
  USING (public.owns_unit(unit_id));
INSERT INTO public.consumption_bills (unit_id, reference_month, kind, reading_prev, reading_curr, amount, attachment_path, created_at)
SELECT unit_id, reference_month, 'energia', energy_prev, energy_curr, total_amount, attachment_path, created_at FROM public.consumption;
INSERT INTO public.consumption_bills (unit_id, reference_month, kind, reading_prev, reading_curr, created_at)
SELECT unit_id, reference_month, 'agua', water_prev, water_curr, created_at FROM public.consumption WHERE water_curr > 0 OR water_prev > 0;
INSERT INTO public.consumption_bills (unit_id, reference_month, kind, reading_prev, reading_curr, created_at)
SELECT unit_id, reference_month, 'climatizacao', hvac_prev, hvac_curr, created_at FROM public.consumption WHERE hvac_curr > 0 OR hvac_prev > 0;
CREATE TRIGGER bills_block_terminated BEFORE INSERT OR UPDATE ON public.consumption_bills
FOR EACH ROW EXECUTE FUNCTION public.block_consumption_on_terminated();
COMMENT ON TABLE public.consumption IS 'DEPRECATED: replaced by consumption_bills (one row per utility)';