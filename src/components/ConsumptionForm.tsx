import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { num, uploadAnexo, type Unit } from "@/lib/condo";

const thisMonth = () => new Date().toISOString().slice(0, 7);

export function ConsumptionForm({ units, compact }: { units: Unit[]; compact?: boolean }) {
  const qc = useQueryClient();
  const [unitId, setUnitId] = useState("");
  const [month, setMonth] = useState(thisMonth());
  const [v, setV] = useState({ ep: "", ec: "", wp: "", wc: "", total: "" });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const n = (s: string) => Number(s.replace(",", ".")) || 0;
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  async function prefillPrev(id: string) {
    setUnitId(id);
    const { data } = await supabase.from("consumption").select("energy_curr, water_curr").eq("unit_id", id).order("reference_month", { ascending: false }).limit(1);
    const last = data?.[0]; if (last) setV((p) => ({ ...p, ep: String(last.energy_curr), wp: String(last.water_curr) }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!unitId) return void toast.error("Selecione a unidade");
    if (n(v.ec) < n(v.ep) || n(v.wc) < n(v.wp)) return void toast.error("Leitura atual não pode ser menor que a anterior");
    setSaving(true);
    try {
      const attachment_path = file ? await uploadAnexo(unitId, file, `fatura-${month}`) : undefined;
      const { error } = await supabase.from("consumption").upsert(
        {
          unit_id: unitId,
          reference_month: `${month}-01`,
          energy_prev: n(v.ep), energy_curr: n(v.ec),
          water_prev: n(v.wp), water_curr: n(v.wc),
          total_amount: n(v.total),
          ...(attachment_path ? { attachment_path } : {}),
        },
        { onConflict: "unit_id,reference_month" },
      );
      if (error) throw error;
      toast.success("Leitura registrada");
      setV({ ep: "", ec: "", wp: "", wc: "", total: "" });
      setFile(null);
      qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const field = "glass-strong";
  return (
    <form onSubmit={save} className="space-y-3">
      <div className={compact ? "space-y-3" : "grid gap-3 sm:grid-cols-2"}>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Unidade</Label>
          <Select value={unitId} onValueChange={prefillPrev}>
            <SelectTrigger className={field}><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {units.map((u) => <SelectItem key={u.id} value={u.id}>{u.identifier} — {u.owner_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Mês/Ano de referência</Label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={field} />
        </div>
      </div>
      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="mb-1 text-xs font-semibold text-primary">Energia (kWh) · consumo {num(Math.max(0, n(v.ec) - n(v.ep)))}</legend>
        <Input inputMode="decimal" placeholder="Leitura anterior" value={v.ep} onChange={set("ep")} className={field} />
        <Input inputMode="decimal" placeholder="Leitura atual" value={v.ec} onChange={set("ec")} className={field} />
      </fieldset>
      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="mb-1 text-xs font-semibold text-primary">Água/Gás (m³) · consumo {num(Math.max(0, n(v.wc) - n(v.wp)))}</legend>
        <Input inputMode="decimal" placeholder="Leitura anterior" value={v.wp} onChange={set("wp")} className={field} />
        <Input inputMode="decimal" placeholder="Leitura atual" value={v.wc} onChange={set("wc")} className={field} />
      </fieldset>
      <div className={compact ? "space-y-3" : "grid gap-3 sm:grid-cols-2"}>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Valor total (R$)</Label>
          <Input inputMode="decimal" placeholder="0,00" value={v.total} onChange={set("total")} className={field} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Boleto / fatura (PDF ou imagem)</Label>
          <Input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={field} />
        </div>
      </div>
      <Button type="submit" variant="highlight" className="w-full" disabled={saving}>{saving ? "Salvando…" : "Registrar leitura"}</Button>
    </form>
  );
}
