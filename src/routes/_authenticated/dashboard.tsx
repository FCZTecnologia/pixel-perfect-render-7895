import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { ConsumptionForm } from "@/components/ConsumptionForm";
import { pageMeta } from "@/lib/page-meta";
import { BillPaymentStatus } from "@/components/BillPaymentStatus";
import { brl, dateLabel, monthLabel, num, openAnexo, unitTypeLabel, utilityLabel, utilityUnit } from "@/lib/condo";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => pageMeta("Visão geral — Painel Bandeiras Empresarial", "Resumo das unidades, faturas, comunicados e ordens de serviço do condomínio."),
  component: Dashboard,
});

function useData() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [u, n, c, o] = await Promise.all([
        supabase.from("units").select("*").order("identifier"),
        supabase.from("notices").select("*").order("created_at", { ascending: false }).limit(3),
        supabase.from("consumption_bills").select("*").order("reference_month", { ascending: false }),
        supabase.from("service_orders").select("*, units(identifier)").order("created_at", { ascending: false }),
      ]);
      if (u.error) throw u.error;
      if (c.error) throw c.error;
      if (o.error) throw o.error;
      return { units: u.data, notices: n.data ?? [], consumption: c.data, orders: o.data };
    },
  });
}

function Stat({ label, value, note, tone = "primary" }: { label: string; value: string; note?: string; tone?: "primary" | "highlight" }) {
  return (
    <Panel className="p-5 lg:p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-3xl font-semibold">{value}</div>
      {note && <div className={tone === "primary" ? "mt-2 text-[11px] text-primary" : "mt-2 text-[11px] text-highlight"}>{note}</div>}
    </Panel>
  );
}

function Dashboard() {
  const { isAdmin } = Route.useRouteContext();
  return isAdmin ? <AdminHome /> : <TenantHome />;
}

function AdminHome() {
  const { data } = useData();
  const units = data?.units ?? [];
  const latest = data?.consumption[0]?.reference_month;
  const monthRows = (data?.consumption ?? []).filter((c) => c.reference_month === latest);
  const sum = (k: string) => monthRows.filter((c) => c.kind === k).reduce((s, c) => s + (c.reading_curr - c.reading_prev), 0);
  const kwh = sum("energia"), hvac = sum("climatizacao"), m3 = sum("agua");
  const open = (data?.orders ?? []).filter((o) => o.status === "pendente" || o.status === "em_andamento");
  const highOpen = open.filter((o) => o.priority === "alta").length;

  return (
    <>
      <PageHeader eyebrow="Painel administrativo" title="Visão geral">
        <div className="glass-strong rounded-xl px-4 py-2.5 text-sm text-foreground/70">{latest ? monthLabel(latest) : "Sem leituras"}</div>
      </PageHeader>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Unidades ativas" value={String(units.filter((u) => u.active).length)} note={`${units.length} cadastradas`} />
        <Stat label="Consumo de energia" value={`${num(kwh)} kWh`} note="mês mais recente" tone="highlight" />
        <Stat label="Consumo de climatização" value={`${num(hvac)} kWh`} note="mês mais recente" />
        <Stat label="Consumo de água/gás" value={`${num(m3)} m³`} note="mês mais recente" />
        <Stat label="Ordens abertas" value={String(open.length)} note={`${highOpen} de alta prioridade`} tone="highlight" />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold">Ordens de serviço recentes</h2>
            <Link to="/ordens" className="text-xs text-primary">Ver todas</Link>
          </div>
          <div className="space-y-3">
            {(data?.orders ?? []).slice(0, 5).map((o) => (
              <Link key={o.id} to="/ordens/$id" params={{ id: o.id }} className="glass-strong flex items-center gap-4 rounded-xl p-4">
                <div className={o.status === "pendente" ? "grid size-10 shrink-0 place-items-center rounded-lg bg-highlight/15 font-semibold text-highlight" : "grid size-10 shrink-0 place-items-center rounded-lg bg-primary/15 font-semibold text-primary"}>OS</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">OS-{o.number} · {o.title}</div>
                  <div className="text-xs text-muted-foreground">{o.units?.identifier} · {dateLabel(o.created_at)}</div>
                </div>
                <StatusBadge status={o.status} />
              </Link>
            ))}
            {data && data.orders.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma ordem de serviço ainda.</p>}
          </div>
        </Panel>
        <Panel>
          <h2 className="mb-4 font-semibold">Lançamento de consumo</h2>
          <ConsumptionForm units={units} compact />
        </Panel>
      </div>
    </>
  );
}

function TenantHome() {
  const { data } = useData();
  const unit = data?.units[0];
  const latestMonth = data?.consumption[0]?.reference_month;
  const bills = (data?.consumption ?? []).filter((c) => c.reference_month === latestMonth);
  const open = (data?.orders ?? []).filter((o) => o.status === "pendente" || o.status === "em_andamento");

  if (data && !unit) {
    return (
      <Panel className="mx-auto max-w-lg text-center">
        <h1 className="text-xl font-semibold">Nenhuma unidade vinculada</h1>
        <p className="mt-2 text-sm text-muted-foreground">Seu e-mail ainda não está associado a uma unidade. Fale com a administração do condomínio.</p>
      </Panel>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Painel do condômino" title={unit ? unit.identifier : "Carregando…"}>
        <div className="flex gap-2">
          <Button asChild variant="highlight"><Link to="/ordens" search={{ nova: true }}>Nova ordem de serviço</Link></Button>
          <Button asChild variant="outline"><Link to="/consumo">Ver faturas</Link></Button>
        </div>
      </PageHeader>
      {unit && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Panel>
            <div className="text-xs text-muted-foreground">Unidade</div>
            <div className="mt-1 font-display text-xl font-semibold">{unit.identifier}</div>
            <div className="mt-3 space-y-1 text-sm text-foreground/70">
              <div>{unitTypeLabel[unit.unit_type]}</div>
              <div>{unit.owner_name}</div>
            </div>
            <span className={unit.active ? "mt-4 inline-flex rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-medium text-success" : "mt-4 inline-flex rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"}>
              {unit.active ? "Ativa" : "Inativa"}
            </span>
          </Panel>
          <Panel>
            <div className="text-xs text-muted-foreground">Fatura mais recente</div>
            {bills.length ? (
              <>
                <div className="mt-1 font-display text-3xl font-semibold">{brl(bills.reduce((t, b) => t + Number(b.amount), 0))}</div>
                <div className="mt-1 text-sm text-foreground/70">{latestMonth ? monthLabel(latestMonth) : ""}</div>
                <div className="mt-3 space-y-2">
                  {bills.map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-2 text-xs">
                      <div><span className="text-muted-foreground">{utilityLabel[b.kind]} · {num(b.reading_curr - b.reading_prev)} {utilityUnit[b.kind]} · {brl(b.amount)}</span><BillPaymentStatus due_date={b.due_date} paid_at={b.paid_at} /></div>
                      {b.attachment_path && <Button variant="outline" size="sm" onClick={() => { if (b.attachment_path) void openAnexo(b.attachment_path); }}>Fatura</Button>}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Nenhuma fatura lançada.</p>
            )}
          </Panel>
          <Panel>
            <div className="text-xs text-muted-foreground">Chamados em aberto</div>
            <div className="mt-1 font-display text-3xl font-semibold">{open.length}</div>
            <div className="mt-3 space-y-2">
              {open.slice(0, 3).map((o) => (
                <Link key={o.id} to="/ordens/$id" params={{ id: o.id }} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{o.title}</span>
                  <StatusBadge status={o.status} />
                </Link>
              ))}
            </div>
          </Panel>
          <Panel className="lg:col-span-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Avisos da administração</h2>
              <Link to="/avisos" className="text-xs text-primary">Ver todos</Link>
            </div>
            {(data?.notices ?? []).map((a) => (
              <div key={a.id} className="border-t border-glass-border py-3 first:border-t-0">
                <div className="text-xs text-muted-foreground">{dateLabel(a.created_at)}</div>
                <div className="font-medium">{a.title}</div>
                {a.body && <p className="mt-1 line-clamp-2 text-sm text-foreground/70">{a.body}</p>}
                {a.unit_id && <Button asChild variant="outline" size="sm" className="mt-2"><Link to="/avisos">Ver conversa e responder</Link></Button>}
              </div>
            ))}
            {data && data.notices.length === 0 && <p className="text-sm text-muted-foreground">Nenhum aviso no momento.</p>}
          </Panel>
        </div>
      )}
    </>
  );
}
