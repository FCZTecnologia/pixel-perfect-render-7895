import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { ConsumptionForm } from "@/components/ConsumptionForm";
import { brl, monthLabel, num, openAnexo } from "@/lib/condo";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/consumo")({
  head: () => ({ meta: [{ title: "Consumo — Condomio" }] }),
  component: ConsumptionPage,
});

function ConsumptionPage() {
  const { isAdmin } = Route.useRouteContext();
  const { data } = useQuery({
    queryKey: ["consumption"],
    queryFn: async () => {
      const [u, c] = await Promise.all([
        supabase.from("units").select("*").order("identifier"),
        supabase.from("consumption").select("*, units(identifier)").order("reference_month", { ascending: false }),
      ]);
      if (u.error) throw u.error;
      if (c.error) throw c.error;
      return { units: u.data, rows: c.data };
    },
  });
  const rows = data?.rows ?? [];
  const download = (p: string) => openAnexo(p).catch(() => toast.error("Não foi possível abrir o anexo"));

  return (
    <>
      <PageHeader eyebrow={isAdmin ? "Energia e água" : "Histórico mensal"} title={isAdmin ? "Gestão de consumo" : "Contas de consumo"} />
      <div className={isAdmin ? "grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]" : ""}>
        <div className="space-y-3">
          {rows.map((r) => (
            <Panel key={r.id} className="grid gap-4 p-5 sm:grid-cols-[1.2fr_1fr_1fr_1fr_auto] sm:items-center lg:p-5">
              <div>
                <div className="font-display font-semibold">{monthLabel(r.reference_month)}</div>
                {isAdmin && <div className="text-xs text-muted-foreground">{r.units?.identifier}</div>}
                <div className="mt-1 text-lg font-semibold text-highlight">{brl(r.total_amount)}</div>
              </div>
              <div className="text-sm">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">Energia</div>
                <div className="text-foreground/70">{num(r.energy_prev)} → {num(r.energy_curr)}</div>
                <div className="font-medium">{num(r.energy_curr - r.energy_prev)} kWh</div>
              </div>
              <div className="text-sm">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">Climatização</div>
                <div className="text-foreground/70">{num(r.hvac_prev)} → {num(r.hvac_curr)}</div>
                <div className="font-medium">{num(r.hvac_curr - r.hvac_prev)} kWh</div>
              </div>
              <div className="text-sm">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">Água/Gás</div>
                <div className="text-foreground/70">{num(r.water_prev)} → {num(r.water_curr)}</div>
                <div className="font-medium">{num(r.water_curr - r.water_prev)} m³</div>
              </div>
              <div>
                {r.attachment_path ? (
                  <Button variant="outline" size="sm" onClick={() => download(r.attachment_path!)}>Ver fatura</Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Sem anexo</span>
                )}
              </div>
            </Panel>
          ))}
          {data && rows.length === 0 && <Panel className="text-center text-sm text-muted-foreground">Nenhuma leitura lançada ainda.</Panel>}
        </div>
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
