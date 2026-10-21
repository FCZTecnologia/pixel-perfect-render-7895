import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel } from "@/components/StatusBadge";
import { ALL_UNITS, UnitFilter } from "@/components/UnitFilter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { pageMeta } from "@/lib/page-meta";

export const Route = createFileRoute("/_authenticated/sugestoes")({
  head: () => pageMeta("Sugestões — Painel Bandeiras Empresarial", "Sugestões dos condôminos enviadas à administração do condomínio."),
  component: SuggestionsPage,
});

function SuggestionsPage() {
  const { isAdmin } = Route.useRouteContext();
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const { data } = useQuery({
    queryKey: ["suggestions"],
    queryFn: async () => {
      const [s, u] = await Promise.all([
        supabase.from("suggestions").select("*, units(identifier, owner_name, active, terminated_at)").order("created_at", { ascending: false }),
        supabase.from("units").select("id").is("terminated_at", null).limit(1),
      ]);
      if (s.error) throw s.error;
      return { rows: s.data, unitId: u.data?.[0]?.id };
    },
  });
  const rows = data?.rows ?? [];
  const [unitId, setUnitId] = useState(ALL_UNITS);
  const filterUnits = [...new Map(rows.map((s) => [s.unit_id, { id: s.unit_id, identifier: s.units?.identifier ?? "Unidade", active: s.units?.active ?? false, terminated_at: s.units?.terminated_at ?? null }])).values()].sort((a, b) => a.identifier.localeCompare(b.identifier));
  const shown = unitId === ALL_UNITS ? rows : rows.filter((s) => s.unit_id === unitId);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const m = msg.trim();
    if (!m) return;
    if (!data?.unitId) return void toast.error("Nenhuma unidade vinculada");
    const { error } = await supabase.from("suggestions").insert({ unit_id: data.unitId, message: m.slice(0, 2000) });
    if (error) return void toast.error(error.message);
    setMsg("");
    toast.success("Sugestão enviada à administração");
    qc.invalidateQueries({ queryKey: ["suggestions"] });
  }
  async function markRead(id: string) {
    await supabase.from("suggestions").update({ is_read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["suggestions"] });
  }

  return (
    <>
      <PageHeader eyebrow={isAdmin ? "Enviadas pelos condôminos" : "Fale com a administração"} title="Sugestões" />
      <div className={isAdmin ? "" : "grid grid-cols-1 gap-5 xl:grid-cols-[380px_1fr]"}>
        {!isAdmin && (
          <Panel className="h-fit">
            <h2 className="mb-4 font-semibold">Nova sugestão</h2>
            <form onSubmit={send} className="space-y-3">
              <Textarea rows={6} placeholder="Escreva sua sugestão" value={msg} onChange={(e) => setMsg(e.target.value)} />
              <Button type="submit" className="w-full">Enviar</Button>
            </form>
          </Panel>
        )}
        <div className="space-y-3">
          {isAdmin && <UnitFilter units={filterUnits} value={unitId} onChange={setUnitId} />}
          {shown.map((s) => (
            <Panel key={s.id} className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">
                  {new Date(s.created_at).toLocaleString("pt-BR")}
                  {isAdmin && ` · ${s.units?.identifier} · ${s.units?.owner_name}`}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{s.message}</p>
              </div>
              {isAdmin && !s.is_read && <Button variant="outline" size="sm" onClick={() => markRead(s.id)}>Marcar como lida</Button>}
              {isAdmin && s.is_read && <span className="text-xs text-muted-foreground">Lida</span>}
            </Panel>
          ))}
          {data && shown.length === 0 && <Panel className="text-center text-sm text-muted-foreground">Nenhuma sugestão ainda.</Panel>}
        </div>
      </div>
    </>
  );
}
