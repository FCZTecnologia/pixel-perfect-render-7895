import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, PriorityBadge, StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dateLabel, priorityLabel, statusLabel, uploadAnexo, type OsPriority, type OsStatus } from "@/lib/condo";
import { pageMeta } from "@/lib/page-meta";

export const Route = createFileRoute("/_authenticated/ordens/")({
  validateSearch: (s: Record<string, unknown>): { nova?: boolean } => (s["nova"] === true || s["nova"] === "true" ? { nova: true } : {}),
  head: () => pageMeta("Ordens de serviço — Painel Bandeiras Empresarial", "Acompanhamento de chamados de manutenção por unidade, status e prioridade."),
  component: OrdersPage,
});

const categories = ["Elétrica", "Hidráulica", "Estrutura", "Limpeza", "Segurança", "Outros"];
const statuses = Object.keys(statusLabel) as OsStatus[];

function OrdersPage() {
  const { isAdmin } = Route.useRouteContext();
  const { nova } = Route.useSearch();
  const navigate = useNavigate({ from: "/ordens/" });
  const [unit, setUnit] = useState("all");
  const [status, setStatus] = useState("all");
  const [prio, setPrio] = useState("all");

  const { data } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const [u, o] = await Promise.all([
        supabase.from("units").select("id, identifier").order("identifier"),
        supabase.from("service_orders").select("*, units(identifier)").order("created_at", { ascending: false }),
      ]);
      if (u.error) throw u.error;
      if (o.error) throw o.error;
      return { units: u.data, orders: o.data };
    },
  });
  const orders = (data?.orders ?? []).filter(
    (o) => (unit === "all" || o.unit_id === unit) && (status === "all" || o.status === status) && (prio === "all" || o.priority === prio),
  );

  return (
    <>
      <PageHeader eyebrow={isAdmin ? "Chamados dos condôminos" : "Manutenção e suporte"} title="Ordens de serviço">
        {!isAdmin && <Button variant="highlight" onClick={() => navigate({ search: { nova: true } })}>Abrir chamado</Button>}
      </PageHeader>

      {isAdmin && (
        <div className="mb-5 flex flex-wrap gap-2">
          <Filter value={unit} onChange={setUnit} all="Todas as unidades" options={(data?.units ?? []).map((u) => [u.id, u.identifier])} />
          <Filter value={status} onChange={setStatus} all="Todos os status" options={Object.entries(statusLabel)} />
          <Filter value={prio} onChange={setPrio} all="Todas as prioridades" options={Object.entries(priorityLabel)} />
        </div>
      )}

      {isAdmin ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statuses.map((s) => {
            const col = orders.filter((o) => o.status === s);
            return (
              <Panel key={s} className="p-4 lg:p-4">
                <div className="mb-3 flex items-center justify-between">
                  <StatusBadge status={s} />
                  <span className="text-xs text-muted-foreground">{col.length}</span>
                </div>
                <div className="space-y-2">
                  {col.map((o) => <OrderCard key={o.id} o={o} />)}
                  {col.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Vazio</p>}
                </div>
              </Panel>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => <OrderCard key={o.id} o={o} row />)}
          {data && orders.length === 0 && <Panel className="text-center text-sm text-muted-foreground">Você ainda não abriu chamados.</Panel>}
        </div>
      )}

      {!isAdmin && (
        <NewOrderDialog open={!!nova} units={data?.units ?? []} onClose={() => navigate({ search: {} })} />
      )}
    </>
  );
}

function Filter({ value, onChange, all, options }: { value: string; onChange: (v: string) => void; all: string; options: [string, string][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="glass-strong w-48"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{all}</SelectItem>
        {options.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

type OrderRow = { id: string; number: number; title: string; status: OsStatus; priority: OsPriority; created_at: string; category: string; units: { identifier: string } | null };
function OrderCard({ o, row }: { o: OrderRow; row?: boolean }) {
  return (
    <Link to="/ordens/$id" params={{ id: o.id }} className={row ? "glass flex items-center gap-4 rounded-2xl p-4" : "glass-strong block rounded-xl p-3"}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">OS-{o.number} · {o.category}</span>
          {!row && <PriorityBadge priority={o.priority} />}
        </div>
        <div className="mt-1 text-sm font-medium leading-snug">{o.title}</div>
        <div className="mt-1 text-xs text-muted-foreground">{o.units?.identifier} · {dateLabel(o.created_at)}</div>
      </div>
      {row && <StatusBadge status={o.status} />}
    </Link>
  );
}

const schema = z.object({
  unit_id: z.string().uuid("Selecione a unidade"),
  title: z.string().trim().min(3, "Informe um título").max(120),
  category: z.string().min(1),
  description: z.string().trim().min(5, "Descreva o problema").max(2000),
  priority: z.enum(["baixa", "media", "alta"]),
});

function NewOrderDialog({ open, units, onClose }: { open: boolean; units: { id: string; identifier: string }[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ unit_id: "", title: "", category: "Elétrica", description: "", priority: "media" as OsPriority });
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const unitId = f.unit_id || units[0]?.id || "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = schema.safeParse({ ...f, unit_id: unitId });
    if (!p.success) return void toast.error(p.error.issues[0]?.message);
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const photos = await Promise.all(files.slice(0, 5).map((file) => uploadAnexo(unitId, file, "os")));
      const { error } = await supabase.from("service_orders").insert({ ...p.data, photos, created_by: u.user!.id });
      if (error) throw error;
      toast.success("Chamado aberto");
      setF({ unit_id: "", title: "", category: "Elétrica", description: "", priority: "media" });
      setFiles([]);
      qc.invalidateQueries();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao abrir chamado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova ordem de serviço</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {units.length > 1 && (
            <div className="space-y-1">
              <Label>Unidade</Label>
              <Select value={unitId} onValueChange={(v) => setF({ ...f, unit_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{units.map((u) => <SelectItem key={u.id} value={u.id}>{u.identifier}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1"><Label>Título</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Prioridade</Label>
              <Select value={f.priority} onValueChange={(v) => setF({ ...f, priority: v as OsPriority })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(priorityLabel).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1"><Label>Descrição do problema</Label><Textarea rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="space-y-1"><Label>Fotos / arquivos (até 5)</Label><Input type="file" multiple accept="image/*,application/pdf" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} /></div>
          <Button type="submit" variant="highlight" className="w-full" disabled={saving || !unitId}>{saving ? "Enviando…" : "Abrir chamado"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
