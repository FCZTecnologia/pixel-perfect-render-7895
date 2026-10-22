import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Building2, Mail, MessageCircle, Pencil, Phone, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { PageHeader, Panel } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { pageMeta } from "@/lib/page-meta";
import { departmentContactSchema, emptyDepartmentContact, phoneContactUrl, whatsappContactUrl, type DepartmentContactForm } from "@/lib/department-contacts";

export const Route = createFileRoute("/_authenticated/fale-conosco")({
  head: () => pageMeta("Fale conosco — Painel Bandeiras Empresarial", "Telefones, WhatsApp e e-mails dos setores do condomínio Bandeiras Empresarial."),
  component: ContactPage,
});
type DepartmentContact = Database["public"]["Tables"]["department_contacts"]["Row"];

function ContactPage() {
  const { isAdmin } = Route.useRouteContext();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<{ id?: string; form: DepartmentContactForm } | null>(null);
  const [busy, setBusy] = useState(false);
  const contacts = useQuery({
    queryKey: ["department-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("department_contacts").select("*").order("name");
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!isAdmin || !editing || busy) return;
    const parsed = departmentContactSchema.safeParse(editing.form);
    if (!parsed.success) return void toast.error(parsed.error.issues[0]?.message ?? "Verifique os contatos");
    setBusy(true);
    try {
      const result = editing.id
        ? await supabase.from("department_contacts").update(parsed.data).eq("id", editing.id).select("id").single()
        : await supabase.from("department_contacts").insert(parsed.data).select("id").single();
      if (result.error) throw result.error;
      await qc.invalidateQueries({ queryKey: ["department-contacts"] });
      setEditing(null);
      toast.success("Contatos do setor salvos");
    } catch {
      toast.error("Não foi possível salvar os contatos. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  function edit(contact: DepartmentContact) {
    setEditing({ id: contact.id, form: { name: contact.name, phone: contact.phone, whatsapp: contact.whatsapp, email: contact.email } });
  }

  return <>
    <PageHeader eyebrow={isAdmin ? "Contatos dos setores" : "Bandeiras Empresarial"} title="Fale conosco">
      {isAdmin && <Button onClick={() => setEditing({ form: { ...emptyDepartmentContact } })}><Plus className="size-4" />Adicionar setor</Button>}
    </PageHeader>
    {contacts.isPending && <p role="status" className="text-sm text-muted-foreground">Carregando contatos…</p>}
    {contacts.isError && <div role="alert" className="space-y-3"><p className="text-sm text-destructive">Não foi possível carregar os contatos.</p><Button variant="outline" onClick={() => void contacts.refetch()}>Tentar novamente</Button></div>}
    {contacts.data?.length === 0 && <div className="py-12 text-center text-muted-foreground"><Building2 className="mx-auto mb-3 size-8" /><p>Nenhum setor cadastrado.</p></div>}
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {contacts.data?.map((contact) => <Panel key={contact.id} className="min-w-0">
        <div className="mb-5 flex items-start justify-between gap-3">
          <h2 className="break-words text-lg font-semibold">{contact.name}</h2>
          {isAdmin && <Button variant="ghost" size="icon" className="shrink-0" title={`Editar ${contact.name}`} aria-label={`Editar ${contact.name}`} onClick={() => edit(contact)}><Pencil className="size-4" /></Button>}
        </div>
        <div className="space-y-4">
          {contact.phone && <div><div className="mb-1 text-xs text-muted-foreground">Telefone</div><a href={phoneContactUrl(contact.phone)} className="flex items-start gap-2 text-sm text-foreground hover:text-primary"><Phone className="mt-0.5 size-4 shrink-0" /><span className="break-all">{contact.phone}</span></a></div>}
          {contact.whatsapp && <div><div className="mb-1 text-xs text-muted-foreground">WhatsApp</div><a href={whatsappContactUrl(contact.whatsapp)} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 text-sm text-success hover:underline"><MessageCircle className="mt-0.5 size-4 shrink-0" /><span className="break-all">{contact.whatsapp}</span></a></div>}
          {contact.email && <div><div className="mb-1 text-xs text-muted-foreground">E-mail</div><a href={`mailto:${contact.email}`} className="flex items-start gap-2 text-sm text-foreground hover:text-primary"><Mail className="mt-0.5 size-4 shrink-0" /><span className="break-all">{contact.email}</span></a></div>}
        </div>
      </Panel>)}
    </div>
    {isAdmin && <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open && !busy) setEditing(null); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader><DialogTitle>{editing?.id ? "Editar setor" : "Adicionar setor"}</DialogTitle></DialogHeader>
        {editing && <form onSubmit={save} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="sector-name">Setor</Label><Input id="sector-name" required maxLength={120} value={editing.form.name} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, name: e.target.value } })} disabled={busy} /></div>
          <div className="space-y-2"><Label htmlFor="sector-phone">Telefone</Label><Input id="sector-phone" type="tel" maxLength={40} placeholder="(11) 3333-4444" value={editing.form.phone} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, phone: e.target.value } })} disabled={busy} /></div>
          <div className="space-y-2"><Label htmlFor="sector-whatsapp">WhatsApp</Label><Input id="sector-whatsapp" type="tel" maxLength={40} placeholder="(11) 99999-8888" value={editing.form.whatsapp} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, whatsapp: e.target.value } })} disabled={busy} /></div>
          <div className="space-y-2"><Label htmlFor="sector-email">E-mail</Label><Input id="sector-email" type="email" maxLength={255} value={editing.form.email} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, email: e.target.value } })} disabled={busy} /></div>
          <div className="flex justify-end gap-2"><Button variant="outline" type="button" disabled={busy} onClick={() => setEditing(null)}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? "Salvando…" : "Salvar contatos"}</Button></div>
        </form>}
      </DialogContent>
    </Dialog>}
  </>;
}