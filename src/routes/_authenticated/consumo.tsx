import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConsumptionForm } from "@/components/ConsumptionForm";
import { brl, monthLabel, num, openAnexo, uploadAnexo, utilityKinds, utilityLabel, utilityUnit } from "@/lib/condo";
import { toast } from "sonner";
import { pageMeta } from "@/lib/page-meta";
import { Input } from "@/components/ui/input";
import { BillPaymentStatus } from "@/components/BillPaymentStatus";

export const Route = createFileRoute("/_authenticated/consumo")({
  head: () => pageMeta("Consumo — Painel Bandeiras Empresarial", "Faturas de eletricidade, água e climatização com vencimentos e confirmação de pagamento."),
  component: ConsumptionPage,
});

function ConsumptionPage() {
  const { isAdmin } = Route.useRouteContext();
  const qc = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["consumption"],
    queryFn: async () => {
      const [u, c] = await Promise.all([
        supabase.from("units").select("*").order("identifier"),
        supabase.from("consumption_bills").select("*, units(identifier)").order("reference_month", { ascending: false }),
      ]);
      if (u.error) throw u.error;
      if (c.error) throw c.error;
      return { units: u.data, rows: c.data };
    },
  });
  const rows = data?.rows ?? [];
  const download = (p: string) => openAnexo(p).catch(() => toast.error("Não foi possível abrir o anexo"));
  async function updateBill(id: string, patch: { paid_at?: string | null; due_date?: string | null; attachment_path?: string | null }) {
    setSavingId(id);
    try {
      const { data: updated, error } = await supabase.from("consumption_bills").update(patch).eq("id", id).select("id").single();
      if (error || !updated) throw error ?? new Error("Não foi possível atualizar a fatura");
      await Promise.all([qc.invalidateQueries({ queryKey: ["consumption"] }), qc.invalidateQueries({ queryKey: ["dashboard"] })]);
      toast.success("Fatura atualizada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a fatura");
    } finally { setSavingId(null); }
  }

  return (
    <>
      <PageHeader eyebrow={isAdmin ? "Eletricidade, água e climatização" : "Histórico mensal"} title={isAdmin ? "Gestão de consumo" : "Contas de consumo"} />
      <div className={isAdmin ? "grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]" : ""}>
        <Tabs defaultValue="energia">
          <TabsList className="mb-4">
            {utilityKinds.map((k) => <TabsTrigger key={k} value={k}>{utilityLabel[k]}</TabsTrigger>)}
          </TabsList>
          {utilityKinds.map((k) => {
            const list = rows.filter((r) => r.kind === k);
            return (
              <TabsContent key={k} value={k} className="space-y-3">
                {list.map((r) => (
                  <Panel key={r.id} className="grid gap-4 p-5 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center lg:p-5">
                    <div>
                      <div className="font-display font-semibold">{monthLabel(r.reference_month)}</div>
                      {isAdmin && <div className="text-xs text-muted-foreground">{r.units?.identifier}</div>}
                      <div className="mt-1 text-lg font-semibold text-highlight">{brl(r.amount)}</div>
                      <BillPaymentStatus due_date={r.due_date} paid_at={r.paid_at} />
                    </div>
                    <div className="text-sm">
                      <div className="text-foreground/70">{num(r.reading_prev)} → {num(r.reading_curr)}</div>
                      <div className="font-medium">{num(r.reading_curr - r.reading_prev)} {utilityUnit[k]}</div>
                    </div>
                    <div className="flex flex-col items-start gap-2">
                      {r.attachment_path ? (
                        <Button variant="outline" size="sm" onClick={() => { if (r.attachment_path) download(r.attachment_path); }}>Ver fatura</Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem anexo</span>
                      )}
                      {isAdmin && <>
                        <label className={`inline-flex cursor-pointer items-center rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent ${savingId !== null ? "pointer-events-none opacity-50" : ""}`}>
                          {r.attachment_path ? "Trocar anexo" : "Anexar fatura"}
                          <input type="file" accept="application/pdf,image/*" className="sr-only" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (!file) return;
                            if (file.size > 20 * 1024 * 1024) { toast.error("Arquivo maior que 20 MB"); return; }
                            try {
                              setSavingId(r.id);
                              const path = await uploadAnexo(r.unit_id, file, `fatura-${k}`);
                              setSavingId(null);
                              await updateBill(r.id, { attachment_path: path });
                            } catch { setSavingId(null); toast.error("Não foi possível enviar o anexo"); }
                          }} />
                        </label>
                        <label className="space-y-1 text-xs text-muted-foreground">
                          <span>Vencimento</span>
                          <Input type="date" aria-label={`Vencimento ${r.units?.identifier} ${monthLabel(r.reference_month)} ${utilityLabel[k]}`} defaultValue={r.due_date ?? ""} key={r.due_date ?? "none"} disabled={savingId !== null || Boolean(r.paid_at)} onBlur={(e) => { if (e.target.value && e.target.value !== r.due_date) void updateBill(r.id, { due_date: e.target.value }); }} />
                        </label>
                        <Button size="sm" variant={r.paid_at ? "outline" : "default"} disabled={savingId !== null} onClick={() => updateBill(r.id, { paid_at: r.paid_at ? null : new Date().toISOString() })}>
                          {savingId === r.id ? "Salvando…" : r.paid_at ? "Desmarcar pagamento" : "Marcar como pago"}
                        </Button>
                      </>}
                    </div>
                  </Panel>
                ))}
                {data && list.length === 0 && <Panel className="text-center text-sm text-muted-foreground">Nenhum lançamento de {utilityLabel[k].toLowerCase()} ainda.</Panel>}
              </TabsContent>
            );
          })}
        </Tabs>
        {isAdmin && (
          <Panel className="h-fit xl:sticky xl:top-8">
            <h2 className="mb-4 font-semibold">Novo lançamento</h2>
            <ConsumptionForm units={data?.units ?? []} compact />
          </Panel>
        )}
      </div>
    </>
  );
}
