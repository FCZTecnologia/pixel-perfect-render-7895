import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Panel, PriorityBadge, StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dateLabel, openAnexo, statusLabel, type OsStatus } from "@/lib/condo";
import { pageMeta } from "@/lib/page-meta";

export const Route = createFileRoute("/_authenticated/ordens/$id")({
  head: () => pageMeta("Detalhe da ordem de serviço — Painel Bandeiras Empresarial", "Descrição, anexos e histórico de respostas de uma ordem de serviço."),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const { isAdmin } = Route.useRouteContext();
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const [o, m] = await Promise.all([
        supabase.from("service_orders").select("*, units(identifier, owner_name)").eq("id", id).maybeSingle(),
        supabase.from("os_messages").select("*").eq("order_id", id).order("created_at"),
      ]);
      if (o.error) throw o.error;
      if (m.error) throw m.error;
      return { order: o.data, messages: m.data };
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  const o = data?.order;
  if (!o) return <Panel>Ordem de serviço não encontrada.</Panel>;

  async function setStatus(s: string) {
    const { error } = await supabase.from("service_orders").update({ status: s as OsStatus, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return void toast.error(error.message);
    toast.success("Status atualizado");
    qc.invalidateQueries();
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = msg.trim();
    if (!text || text.length > 2000) return;
    setSending(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("os_messages").insert({ order_id: id, message: text, from_admin: isAdmin, author_id: u.user!.id });
    setSending(false);
    if (error) return void toast.error(error.message);
    setMsg("");
    qc.invalidateQueries({ queryKey: ["order", id] });
  }

  return (
    <>
      <Link to="/ordens" className="text-sm text-primary">← Ordens de serviço</Link>
      <div className="mt-3 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">OS-{o.number} · {o.category}</span>
            <StatusBadge status={o.status} />
            <PriorityBadge priority={o.priority} />
          </div>
          <h1 className="mt-2 text-2xl font-semibold">{o.title}</h1>
          <div className="mt-1 text-sm text-muted-foreground">{o.units?.identifier} · {o.units?.owner_name} · aberta em {dateLabel(o.created_at)}</div>
          <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed">{o.description}</p>
          {o.photos.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {o.photos.map((p, i) => (
                <Button key={p} variant="outline" size="sm" onClick={() => openAnexo(p).catch(() => toast.error("Arquivo indisponível"))}>Anexo {i + 1}</Button>
              ))}
            </div>
          )}

          <h2 className="mt-8 mb-3 font-semibold">Histórico de atualizações</h2>
          <div className="space-y-3">
            {data.messages.map((m) => (
              <div key={m.id} className={m.from_admin ? "glass-strong rounded-xl border-l-4 !border-l-primary p-3" : "glass-strong rounded-xl p-3"}>
                <div className="text-[11px] text-muted-foreground">{m.from_admin ? "Administração" : "Condômino"} · {dateLabel(m.created_at)}</div>
                <div className="mt-1 whitespace-pre-wrap text-sm">{m.message}</div>
              </div>
            ))}
            {data.messages.length === 0 && <p className="text-sm text-muted-foreground">Sem mensagens ainda.</p>}
          </div>
          <form onSubmit={send} className="mt-4 space-y-2">
            <Textarea rows={3} placeholder={isAdmin ? "Resposta ou observação para o condômino…" : "Adicionar informação…"} value={msg} onChange={(e) => setMsg(e.target.value)} className="glass-strong" />
            <Button type="submit" disabled={sending || !msg.trim()}>Enviar</Button>
          </form>
        </Panel>

        {isAdmin && (
          <Panel className="h-fit">
            <h2 className="mb-3 font-semibold">Atualizar status</h2>
            <Select value={o.status} onValueChange={setStatus}>
              <SelectTrigger className="glass-strong"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(statusLabel).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
            </Select>
            <p className="mt-3 text-xs text-muted-foreground">O condômino verá o novo status e as respostas no painel dele.</p>
          </Panel>
        )}
      </div>
    </>
  );
}
