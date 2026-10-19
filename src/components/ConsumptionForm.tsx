import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { num, uploadAnexo, utilityKinds, utilityLabel, utilityUnit, type Unit, type UtilityKind } from "@/lib/condo";

const thisMonth = () => new Date().toISOString().slice(0, 7);

export function ConsumptionForm({ units, compact }: { units: Unit[]; compact?: boolean }) {
  const qc = useQueryClient();
  const [unitId, setUnitId] = useState("");
  const [kind, setKind] = useState<UtilityKind>("energia");
  const [month, setMonth] = useState(thisMonth());
  const [dueDate, setDueDate] = useState("");
  const [v, setV] = useState({ prev: "", curr: "", amount: "" });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const n = (s: string) => Number(s.replace(",", ".")) || 0;
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  async function prefill(id: string, k: UtilityKind) {
    setUnitId(id); setKind(k);
    if (!id) return;
    const { data } = await supabase.from("consumption_bills").select("reading_curr").eq("unit_id", id).eq("kind", k).order("reference_month", { ascending: false }).limit(1);
    setV((p) => ({ ...p, prev: data?.[0] ? String(data[0].reading_curr) : "" }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!unitId) return void toast.error("Selecione a unidade");
    if (n(v.curr) < n(v.prev)) return void toast.error("Leitura atual não pode ser menor que a anterior");
    setSaving(true);
    try {
      const attachment_path = file ? await uploadAnexo(unitId, file, `fatura-${kind}-${month}`) : undefined;
      const { error } = await supabase.from("consumption_bills").upsert(
        {
          unit_id: unitId, kind, reference_month: `${month}-01`,
          reading_prev: n(v.prev), reading_curr: n(v.curr), amount: n(v.amount),
          due_date: dueDate || null,
          ...(attachment_path ? { attachment_path } : {}),
        },
        { onConflict: "unit_id,reference_month,kind" },
      );
      if (error) throw error;
      toast.success(`${utilityLabel[kind]} registrada`);
      setV({ prev: "", curr: "", amount: "" });
      setFile(null);
      setDueDate("");
      qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const field = "glass-strong";
  const grid = compact ? "space-y-3" : "grid gap-3 sm:grid-cols-2";
  return (
    <form onSubmit={save} className="space-y-3">
      <div className="grid grid-cols-3 gap-1 rounded-xl glass-strong p-1">
        {utilityKinds.map((k) => (
          <Button key={k} variant="ghost" type="button" onClick={() => prefill(unitId, k)}
            className={k === kind ? "rounded-lg bg-primary px-2 py-1.5 text-xs font-semibold text-primary-foreground" : "rounded-lg px-2 py-1.5 text-xs text-muted-foreground"}>
            {utilityLabel[k]}
          </Button>
        ))}
      </div>
      <div className={grid}>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Unidade</Label>
          <Select value={unitId} onValueChange={(id) => prefill(id, kind)}>
            <SelectTrigger className={field}><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {units.filter((u) => !u.terminated_at && u.active).map((u) => <SelectItem key={u.id} value={u.id}>{u.identifier} — {u.owner_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Mês/Ano de referência</Label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={field} />
        </div>
      </div>
      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="mb-1 text-xs font-semibold text-primary">{utilityLabel[kind]} ({utilityUnit[kind]}) · consumo {num(Math.max(0, n(v.curr) - n(v.prev)))}</legend>
        <Input inputMode="decimal" placeholder="Leitura anterior" value={v.prev} onChange={set("prev")} className={field} />
        <Input inputMode="decimal" placeholder="Leitura atual" value={v.curr} onChange={set("curr")} className={field} />
      </fieldset>
      <div className="space-y-1">
        <Label htmlFor="bill-due-date" className="text-[11px] text-muted-foreground">Data de vencimento</Label>
        <Input id="bill-due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={field} required />
      </div>
      <div className={grid}>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Valor (R$)</Label>
          <Input inputMode="decimal" placeholder="0,00" value={v.amount} onChange={set("amount")} className={field} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Boleto / fatura (PDF ou imagem)</Label>
          <Input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={field} />
        </div>
      </div>
      <Button type="submit" variant="highlight" className="w-full" disabled={saving}>{saving ? "Salvando…" : `Registrar ${utilityLabel[kind].toLowerCase()}`}</Button>
    </form>
  );
}
