CREATE TABLE public.department_contacts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
 phone text NOT NULL DEFAULT '' CHECK (char_length(phone) <= 40),
 whatsapp text NOT NULL DEFAULT '' CHECK (char_length(whatsapp) <= 40),
 email text NOT NULL DEFAULT '' CHECK (char_length(email) <= 255),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.department_contacts TO authenticated;
GRANT ALL ON public.department_contacts TO service_role;
ALTER TABLE public.department_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads contacts" ON public.department_contacts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "current tenants read contacts" ON public.department_contacts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.units u WHERE public.owns_unit(u.id)));
CREATE POLICY "admin creates contacts" ON public.department_contacts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin edits contacts" ON public.department_contacts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
