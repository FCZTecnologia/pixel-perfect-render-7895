import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportUnitReport, unitTypeLabel, brl, monthLabel, utilityLabel, statusLabel, type Unit, type UnitType } from "@/lib/condo";
import { terminationPendingItems, pendingItemsSignature } from "@/lib/unit-lifecycle";
import { dueDateLabel } from "@/lib/billing";
import { Checkbox } from "@/components/ui/checkbox";
import { useServerFn } from "@tanstack/react-start";
import { setTenantLogin, terminateUnit } from "@/lib/tenants.functions";
import { pageMeta } from "@/lib/page-meta";
import { Trash2 } from "lucide-react";
import { deleteRegisteredUnit } from "@/lib/unit-deletion";

export const Route = createFileRoute("/_authenticated/unidades")({
  beforeLoad: ({ context }) => {
    if (!context.isAdmin) throw redirect({ to: "/dashboard" });
  },
  head: () => pageMeta("Unidades — Painel Bandeiras Empresarial", "Cadastro de unidades, responsáveis, acessos e encerramento de contratos."),
  component: UnitsPage,
});

const schema = z.object({
  identifier: z.string().trim().min(1, "Informe a identificação").max(80),
  unit_type: z.enum(["galpao", "sala_comercial", "residencial"]),
  owner_name: z.string().trim().min(1, "Informe o responsável").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(255),
  phone: z.string().trim().max(30),
  document: z.string().trim().max(30),
  active: z.boolean(),
});
type Form = z.infer<typeof schema>;
const empty: Form = { identifier: "", unit_type: "sala_comercial", owner_name: "", email: "", phone: "", document: "", active: true };

function UnitsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<{ id?: string; form: Form } | null>(null);
  const [login, setLogin] = useState<{ unit: Unit; username: string; password: string } | null>(null);
  const [ending, setEnding] = useState<Unit | null>(null);
  const [acknowledgedPending, setAcknowledgedPending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Unit | null>(null);
  const [busy, setBusy] = useState(false);
  const setLoginFn = useServerFn(setTenantLogin);
  const terminateFn = useServerFn(terminateUnit);
  async function loadPending(unitId: string) {
    const [bills, orders] = await Promise.all([
      supabase.from("consumption_bills").select("id, kind, reference_month, amount, due_date, paid_at").eq("unit_id", unitId).is("paid_at", null).order("reference_month").order("id"),
      supabase.from("service_orders").select("id, number, title, status").eq("unit_id", unitId).in("status", ["pendente", "em_andamento"]).order("number"),
    ]);
    if (bills.error) throw bills.error;
    if (orders.error) throw orders.error;
    return terminationPendingItems(bills.data, orders.data);
  }
  const pending = useQuery({
    queryKey: ["termination-pending", ending?.id],
    enabled: Boolean(ending),
    queryFn: () => {
      if (!ending) throw new Error("Selecione a unidade");
      return loadPending(ending.id);
    },
    refetchInterval: 15000,
  });
  const pendingSignature = pending.data ? pendingItemsSignature(pending.data) : null;
  const hasPending = Boolean(pending.data && (pending.data.bills.length || pending.data.orders.length));

  async function saveLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!login) return;
    setBusy(true);
    try {
      await setLoginFn({ data: { unitId: login.unit.id, username: login.username, password: login.password } });
      toast.success("Acesso salvo");
      setLogin(null);
      qc.invalidateQueries();
    } catch (err) {
      const m = err instanceof Error ? err.message : "Erro";
      toast.error(m.startsWith("[") ? "Verifique usuário (3+ caracteres) e senha (6+)" : m);
    } finally {
      setBusy(false);
    }
  }

  async function removeUnit() {
    if (!deleting || busy) return;
    setBusy(true);
    try {
      await deleteRegisteredUnit(supabase, deleting.id);
      setDeleting(null);
      await qc.invalidateQueries();
      toast.success("Unidade excluída");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir a unidade");
    } finally {
      setBusy(false);
    }
  }

  async function terminate() {
    if (!ending || busy || !pending.data || (hasPending && acknowledgedPending !== pendingSignature)) return;
    setBusy(true);
    try {
      const latest = await loadPending(ending.id);
      if (pendingItemsSignature(latest) !== pendingSignature) {
        qc.setQueryData(["termination-pending", ending.id], latest);
        setAcknowledgedPending(null);
        toast.error("As pendências mudaram. Confira a lista novamente antes de encerrar.");
        return;
      }
      await exportUnitReport(ending);
      await terminateFn({ data: { unitId: ending.id } });
      toast.success("Contrato encerrado e unidade inativada");
      setEnding(null);
      qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao encerrar");
    } finally {
      setBusy(false);
    }
  }
  const { data: units = [] } = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("*").order("identifier");
      if (error) throw error;
      return data;
    },
  });
  const filtered = units
    .filter((u) => showInactive || (u.active && !u.terminated_at))
    .filter((u) => `${u.identifier} ${u.owner_name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));

  function open(u?: Unit) {
    setEditing(u ? { id: u.id, form: { ...u, phone: u.phone ?? "", document: u.document ?? "" } } : { form: empty });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const p = schema.safeParse(editing.form);
    if (!p.success) return void toast.error(p.error.issues[0]?.message);
    const { error } = editing.id
      ? await supabase.from("units").update(p.data).eq("id", editing.id)
      : await supabase.from("units").insert(p.data);
    if (error) return void toast.error(error.message);
    toast.success("Unidade salva");
    setEditing(null);
    qc.invalidateQueries();
  }

  const f = editing?.form;
  const upd = (patch: Partial<Form>) => editing && setEditing({ ...editing, form: { ...editing.form, ...patch } });

  return (
    <>
      <PageHeader eyebrow="Cadastro" title="Unidades">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm"><Switch checked={showInactive} onCheckedChange={setShowInactive} /> Mostrar inativos</label>
          <Input placeholder="Buscar unidade…" value={q} onChange={(e) => setQ(e.target.value)} className="glass-strong w-56" />
          <Button variant="highlight" onClick={() => open()}>Nova unidade</Button>
        </div>
      </PageHeader>
      <Panel className="overflow-x-auto p-0 lg:p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 font-medium">Unidade</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">Responsável</th>
              <th className="px-5 py-3 font-medium">Contato</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((u) => (
              <tr key={u.id}>
                <td className="px-5 py-3 font-medium">{u.identifier}</td>
                <td className="px-5 py-3 text-foreground/70">{unitTypeLabel[u.unit_type]}</td>
                <td className="px-5 py-3">
                  <div>{u.owner_name}</div>
                  <div className="text-xs text-muted-foreground">{u.document}</div>
                </td>
                <td className="px-5 py-3">
                  <div>{u.email}</div>
                  <div className="text-xs text-muted-foreground">{u.phone}</div>
                </td>
                <td className="px-5 py-3">
                  <span className={u.active ? "rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-medium text-success" : "rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"}>
                    {u.terminated_at ? "Encerrado" : u.active ? "Ativo" : "Inativo"}
                  </span>
                  <div className="mt-1 text-xs text-muted-foreground">{u.username ? `Usuário: ${u.username}` : "Sem acesso"}</div>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                  {u.terminated_at ? (
                    <Button variant="outline" size="sm" onClick={() => exportUnitReport(u).catch(() => toast.error("Falha ao exportar"))}>Exportar</Button>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => open(u)}>Editar</Button>
                      <Button variant="outline" size="sm" onClick={() => setLogin({ unit: u, username: u.username ?? "", password: "" })}>Acesso</Button>
                      <Button variant="outline" size="sm" className="text-destructive" onClick={() => { setAcknowledgedPending(null); setEnding(u); }}>Encerrar contrato</Button>
                    </div>
                  )}
                  <Button variant="ghost" size="icon" className="shrink-0 text-destructive" aria-label={`Excluir unidade ${u.identifier}`} title="Excluir unidade" disabled={busy} onClick={() => setDeleting(u)}><Trash2 className="size-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">Nenhuma unidade cadastrada.</td></tr>
            )}
          </tbody>
        </table>
      </Panel>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Editar unidade" : "Nova unidade"}</DialogTitle></DialogHeader>
          {f && (
            <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label>Identificação</Label><Input placeholder="Galpão 01" value={f.identifier} onChange={(e) => upd({ identifier: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={f.unit_type} onValueChange={(v) => upd({ unit_type: v as UnitType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(unitTypeLabel).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:col-span-2"><Label>Condômino / Empresa</Label><Input value={f.owner_name} onChange={(e) => upd({ owner_name: e.target.value })} /></div>
              <div className="space-y-1 sm:col-span-2"><Label>E-mail de contato</Label><Input type="email" value={f.email} onChange={(e) => upd({ email: e.target.value })} /></div>
              <div className="space-y-1"><Label>Telefone</Label><Input value={f.phone} onChange={(e) => upd({ phone: e.target.value })} /></div>
              <div className="space-y-1"><Label>CPF / CNPJ</Label><Input value={f.document} onChange={(e) => upd({ document: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2"><Switch checked={f.active} onCheckedChange={(c) => upd({ active: c })} /> Unidade ativa</label>
              <Button type="submit" className="sm:col-span-2">Salvar</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!login} onOpenChange={(o) => !o && setLogin(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Acesso do condômino · {login?.unit.identifier}</DialogTitle></DialogHeader>
          {login && (
            <form onSubmit={saveLogin} className="space-y-3">
              <div className="space-y-1"><Label>Usuário</Label><Input value={login.username} onChange={(e) => setLogin({ ...login, username: e.target.value })} placeholder="galpao01" /></div>
              <div className="space-y-1"><Label>{login.unit.username ? "Nova senha" : "Senha"}</Label><Input type="text" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} /></div>
              <p className="text-xs text-muted-foreground">Entregue o usuário e a senha ao condômino. Ele entra com esses dados na tela de login.</p>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Salvando…" : "Salvar acesso"}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && !busy && setDeleting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir unidade · {deleting?.identifier}</DialogTitle></DialogHeader>
          <p className="text-sm text-foreground/70">A unidade e seu histórico de consumo, ordens de serviço, sugestões e comunicados individuais serão excluídos definitivamente. O condômino perderá acesso aos dados dessa unidade. Esta ação não pode ser desfeita.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</Button>
            {deleting && <Button variant="outline" disabled={busy} onClick={() => exportUnitReport(deleting).catch(() => toast.error("Falha ao exportar"))}>Exportar relatório</Button>}
            <Button variant="destructive" disabled={busy} onClick={removeUnit}><Trash2 className="mr-2 size-4" />{busy ? "Excluindo…" : "Excluir definitivamente"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!ending} onOpenChange={(o) => !o && !busy && setEnding(null)}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>Encerrar contrato · {ending?.identifier}</DialogTitle></DialogHeader>
          <p className="text-sm text-foreground/70">
            Vamos baixar um relatório com todos os dados da unidade, consumos, ordens de serviço e sugestões desde o início do vínculo.
            Depois a unidade será inativada e o acesso do condômino bloqueado. Para uma nova locação, crie um novo cadastro.
          </p>
          {pending.isPending && <p role="status" className="text-sm text-muted-foreground">Verificando contas e ordens de serviço…</p>}
          {pending.isError && <div className="space-y-2"><p role="alert" className="text-sm text-destructive">Não foi possível verificar as pendências. O encerramento não está disponível.</p><Button variant="outline" onClick={() => pending.refetch()}>Tentar novamente</Button></div>}
          {pending.data && <div className="space-y-4">
            <section>
              <h3 className="text-sm font-semibold">Contas em aberto ({pending.data.bills.length}) · {brl(pending.data.bills.reduce((sum, bill) => sum + bill.amount, 0))}</h3>
              {pending.data.bills.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">Nenhuma conta em aberto.</p> : <ul className="mt-2 divide-y text-sm">{pending.data.bills.map((bill) => <li key={bill.id} className="py-2"><div>{utilityLabel[bill.kind]} · {monthLabel(bill.reference_month)} · {brl(bill.amount)}</div><div className="text-xs text-muted-foreground">Vencimento: {bill.due_date ? dueDateLabel(bill.due_date) : "Não informado"}</div></li>)}</ul>}
            </section>
            <section>
              <h3 className="text-sm font-semibold">Ordens de serviço abertas ({pending.data.orders.length})</h3>
              {pending.data.orders.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">Nenhuma ordem de serviço aberta.</p> : <ul className="mt-2 divide-y text-sm">{pending.data.orders.map((order) => <li key={order.id} className="break-words py-2">OS-{order.number} · {order.title}<div className="text-xs text-muted-foreground">{statusLabel[order.status]}</div></li>)}</ul>}
            </section>
            {hasPending && <label className="flex items-start gap-2 text-sm text-destructive"><Checkbox aria-label="Confirmar encerramento com pendências" checked={acknowledgedPending === pendingSignature} onCheckedChange={(checked) => setAcknowledgedPending(checked === true ? pendingSignature : null)} /><span>Estou ciente das pendências acima e desejo encerrar o contrato mesmo assim. As contas e ordens permanecerão no histórico.</span></label>}
          </div>}
          <Button variant="destructive" disabled={busy || pending.isFetching || !pending.data || pending.isError || (hasPending && acknowledgedPending !== pendingSignature)} onClick={terminate}>{busy ? "Encerrando…" : "Exportar e encerrar"}</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
