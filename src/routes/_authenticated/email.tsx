import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Save, Send, Mail } from "lucide-react";
import { getSmtpSettings, saveSmtpSettings, testSmtp } from "@/lib/smtp.functions";
import { defaultSmtpSettings, type PublicSmtpSettings } from "@/lib/smtp-config";
import { supabase } from "@/integrations/supabase/client";
import { pageMeta } from "@/lib/page-meta";
import { PageHeader } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/email")({
  beforeLoad: ({ context }) => { if (!context.isAdmin) throw redirect({ to: "/dashboard" }); },
  head: () => pageMeta("E-mail e notificações — Painel Bandeiras Empresarial", "Configuração SMTP e notificações de contas e comunicados para as unidades."),
  component: EmailSettingsPage,
});

function EmailSettingsPage() {
  const getSettings = useServerFn(getSmtpSettings);
  const saveSettings = useServerFn(saveSmtpSettings);
  const sendTest = useServerFn(testSmtp);
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["smtp-settings"], queryFn: () => getSettings() });
  const { data: units = [] } = useQuery({ queryKey: ["smtp-test-units"], queryFn: async () => {
    const { data, error } = await supabase.from("units").select("id, identifier, email").eq("active", true).is("terminated_at", null).order("identifier");
    if (error) throw error;
    return data;
  } });
  const [draft, setDraft] = useState<PublicSmtpSettings | null>(null);
  const [password, setPassword] = useState("");
  const [unitId, setUnitId] = useState("");
  const [busy, setBusy] = useState(false);
  const form = draft ?? settings.data ?? defaultSmtpSettings;
  const update = (patch: Partial<PublicSmtpSettings>) => setDraft({ ...form, ...patch });
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const saved = await saveSettings({ data: { ...form, password } });
      qc.setQueryData(["smtp-settings"], saved); setDraft(null); setPassword("");
      toast.success("Configuração SMTP salva");
    } catch { toast.error("Não foi possível salvar. Confira os campos e a senha SMTP."); }
    finally { setBusy(false); }
  }
  async function test() {
    if (!unitId) return;
    setBusy(true);
    try { await sendTest({ data: { unitId } }); toast.success("E-mail de teste enviado ao contato da unidade"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível enviar o teste"); }
    finally { setBusy(false); }
  }
  return <>
    <PageHeader eyebrow="Administração" title="E-mail e notificações"><Mail className="size-6 text-primary" /></PageHeader>
    <div className="max-w-2xl">
      {settings.isPending && <p role="status" className="text-sm text-muted-foreground">Carregando configuração…</p>}
      {settings.isError && <div className="space-y-3"><p role="alert" className="text-sm text-destructive">Não foi possível carregar a configuração SMTP.</p><Button variant="outline" onClick={() => settings.refetch()}>Tentar novamente</Button></div>}
      {settings.data && <>
        <form onSubmit={save} className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4"><Label htmlFor="smtp-enabled">Envio de e-mails</Label><Switch id="smtp-enabled" checked={form.enabled} onCheckedChange={(enabled) => update({ enabled })} /></div>
          <section className="space-y-4">
            <h2 className="font-semibold">Servidor SMTP</h2>
            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              <div className="space-y-2"><Label htmlFor="smtp-host">Servidor</Label><Input id="smtp-host" placeholder="mail.seudominio.com.br" value={form.host} required onChange={(e) => update({ host: e.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="smtp-port">Porta SSL/TLS</Label><Input id="smtp-port" value="465" readOnly /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="smtp-user">Usuário SMTP</Label><Input id="smtp-user" autoComplete="off" value={form.username} required onChange={(e) => update({ username: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="smtp-password">Senha SMTP {form.passwordSet && "· configurada"}</Label><Input id="smtp-password" type="password" autoComplete="new-password" value={password} required={!form.passwordSet} placeholder={form.passwordSet ? "Deixe em branco para manter a senha" : ""} onChange={(e) => setPassword(e.target.value)} /></div>
          </section>
          <section className="space-y-4 border-t pt-5">
            <h2 className="font-semibold">Remetente</h2>
            <div className="space-y-2"><Label htmlFor="smtp-from-name">Nome</Label><Input id="smtp-from-name" value={form.fromName} required onChange={(e) => update({ fromName: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="smtp-from-email">E-mail</Label><Input id="smtp-from-email" type="email" value={form.fromEmail} required onChange={(e) => update({ fromEmail: e.target.value })} /></div>
          </section>
          <section className="space-y-4 border-t pt-5">
            <h2 className="font-semibold">Notificações automáticas</h2>
            <div className="flex items-center justify-between gap-3"><Label htmlFor="notify-bills">Contas de consumo lançadas</Label><Switch id="notify-bills" checked={form.notifyBills} onCheckedChange={(notifyBills) => update({ notifyBills })} /></div>
            <div className="flex items-center justify-between gap-3"><Label htmlFor="notify-notices">Avisos gerais e individuais</Label><Switch id="notify-notices" checked={form.notifyNotices} onCheckedChange={(notifyNotices) => update({ notifyNotices })} /></div>
          </section>
          <Button type="submit" disabled={busy}><Save className="mr-2 size-4" />{busy ? "Aguarde…" : "Salvar configuração"}</Button>
        </form>
        <section className="mt-8 space-y-4 border-t pt-5">
          <h2 className="font-semibold">Teste de envio</h2>
          <Select value={unitId} onValueChange={setUnitId}><SelectTrigger aria-label="Unidade para teste"><SelectValue placeholder="Selecione a unidade" /></SelectTrigger><SelectContent>{units.map((u) => <SelectItem key={u.id} value={u.id}>{u.identifier} · {u.email}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" disabled={busy || !unitId || !form.passwordSet || Boolean(draft) || Boolean(password)} onClick={test}><Send className="mr-2 size-4" />Enviar teste</Button>
        </section>
      </>}
    </div>
  </>;
}