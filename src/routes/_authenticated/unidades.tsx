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
import { unitTypeLabel, type Unit, type UnitType } from "@/lib/condo";

export const Route = createFileRoute("/_authenticated/unidades")({
  beforeLoad: ({ context }) => {
    if (!context.isAdmin) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Unidades — Condomio" }] }),
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
  const [editing, setEditing] = useState<{ id?: string; form: Form } | null>(null);
  const { data: units = [] } = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("*").order("identifier");
      if (error) throw error;
      return data;
    },
  });
  const filtered = units.filter((u) => `${u.identifier} ${u.owner_name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));

  function open(u?: Unit) {
    setEditing(u ? { id: u.id, form: { ...u, phone: u.phone ?? "", document: u.document ?? "" } } : { form: empty });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const p = schema.safeParse(editing.form);
    if (!p.success) return toast.error(p.error.issues[0].message);
    const { error } = editing.id
      ? await supabase.from("units").update(p.data).eq("id", editing.id)
      : await supabase.from("units").insert(p.data);
    if (error) return toast.error(error.message);
    toast.success("Unidade salva");
    setEditing(null);
    qc.invalidateQueries();
  }

  const f = editing?.form;
  const upd = (patch: Partial<Form>) => editing && setEditing({ ...editing, form: { ...editing.form, ...patch } });

  return (
    <>
      <PageHeader eyebrow="Cadastro" title="Unidades">
        <div className="flex gap-2">
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
                    {u.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <Button variant="outline" size="sm" onClick={() => open(u)}>Editar</Button>
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
              <div className="space-y-1 sm:col-span-2"><Label>E-mail de acesso</Label><Input type="email" value={f.email} onChange={(e) => upd({ email: e.target.value })} /></div>
              <div className="space-y-1"><Label>Telefone</Label><Input value={f.phone} onChange={(e) => upd({ phone: e.target.value })} /></div>
              <div className="space-y-1"><Label>CPF / CNPJ</Label><Input value={f.document} onChange={(e) => upd({ document: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2"><Switch checked={f.active} onCheckedChange={(c) => upd({ active: c })} /> Unidade ativa</label>
              <Button type="submit" className="sm:col-span-2">Salvar</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
