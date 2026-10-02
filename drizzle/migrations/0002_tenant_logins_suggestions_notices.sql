ALTER TABLE public.units ADD COLUMN username text, ADD COLUMN login_user_id uuid, ADD COLUMN terminated_at timestamptz;
CREATE UNIQUE INDEX units_username_key ON public.units (lower(username));

CREATE OR REPLACE FUNCTION public.owns_unit(_unit_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  select exists (select 1 from public.units u where u.id = _unit_id and u.terminated_at is null
    and (u.login_user_id = auth.uid() or lower(u.email) = lower(coalesce(auth.jwt()->>'email',''))))
$$;

DROP POLICY "tenant reads own unit" ON public.units;
CREATE POLICY "tenant reads own unit" ON public.units FOR SELECT TO authenticated USING (public.owns_unit(id));

CREATE TABLE public.suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid(),
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suggestions TO authenticated;
GRANT ALL ON public.suggestions TO service_role;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all suggestions" ON public.suggestions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "tenant reads own suggestions" ON public.suggestions FOR SELECT TO authenticated USING (public.owns_unit(unit_id));
CREATE POLICY "tenant creates suggestions" ON public.suggestions FOR INSERT TO authenticated WITH CHECK (public.owns_unit(unit_id) AND author_id = auth.uid() AND is_read = false);

CREATE TABLE public.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notices TO authenticated;
GRANT ALL ON public.notices TO service_role;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all notices" ON public.notices FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "signed in read notices" ON public.notices FOR SELECT TO authenticated USING (true);