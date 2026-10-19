ALTER TABLE public.notices ADD COLUMN unit_id uuid REFERENCES public.units(id);
DROP POLICY "signed in read notices" ON public.notices;
CREATE POLICY "signed in read notices" ON public.notices FOR SELECT TO authenticated USING (unit_id IS NULL OR public.owns_unit(unit_id));
CREATE INDEX notices_unit_id_idx ON public.notices(unit_id);
CREATE TABLE public.notice_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 notice_id uuid NOT NULL REFERENCES public.notices(id) ON DELETE CASCADE,
 author_id uuid NOT NULL DEFAULT auth.uid(),
 from_admin boolean NOT NULL DEFAULT false,
 message text NOT NULL CHECK (length(trim(message)) BETWEEN 1 AND 4000),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.notice_messages TO authenticated;
GRANT ALL ON public.notice_messages TO service_role;
ALTER TABLE public.notice_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read targeted notice messages" ON public.notice_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.notices n WHERE n.id = notice_id AND n.unit_id IS NOT NULL AND (public.has_role(auth.uid(), 'admin') OR public.owns_unit(n.unit_id))));
CREATE POLICY "reply to targeted notices" ON public.notice_messages FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND from_admin = public.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.notices n WHERE n.id = notice_id AND n.unit_id IS NOT NULL AND (public.has_role(auth.uid(), 'admin') OR public.owns_unit(n.unit_id))));
CREATE INDEX notice_messages_notice_idx ON public.notice_messages(notice_id, created_at);
ALTER TABLE public.consumption_bills ADD COLUMN due_date date, ADD COLUMN paid_at timestamptz;