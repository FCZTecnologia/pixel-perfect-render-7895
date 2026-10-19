import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { dateLabel } from "@/lib/condo";
import { pageMeta } from "@/lib/page-meta";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NoticeConversation, type ConversationNotice } from "@/components/NoticeConversation";

export const Route = createFileRoute("/_authenticated/avisos")({
  head: () => pageMeta("Avisos — Painel Bandeiras Empresarial", "Comunicados gerais e individuais da administração e respostas dos condôminos."),
  component: NoticesPage,
});

export function useNotices() {
  return useQuery({
    queryKey: ["notices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notices").select("*, units(identifier)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function NoticesPage() {
  const { isAdmin } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data = [], isPending, error } = useNotices();
  const { data: units = [] } = useQuery({ queryKey: ["notice-units"], enabled: isAdmin, queryFn: async () => {
    const { data, error } = await supabase.from("units").select("id, identifier, owner_name").eq("active", true).is("terminated_at", null).order("identifier");
    if (error) throw error;
    return data;
  } });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("general");
  const [saving, setSaving] = useState(false);
  const [conversation, setConversation] = useState<ConversationNotice | null>(null);

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return void toast.error("Informe o título");
    setSaving(true);
    const { error } = await supabase.from("notices").insert({ title: title.trim().slice(0, 150), body: body.trim().slice(0, 4000), unit_id: target === "general" ? null : target });
    setSaving(false);
    if (error) return void toast.error(error.message);
    setTitle(""); setBody("");
    toast.success("Aviso publicado");
    qc.invalidateQueries({ queryKey: ["notices"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }
  async function remove(id: string) {
    const { error } = await supabase.from("notices").delete().eq("id", id);
    if (error) return void toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["notices"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  return (
    <>
      <PageHeader eyebrow="Comunicados" title="Avisos" />
      <div className={isAdmin ? "grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]" : ""}>
        <Tabs defaultValue="general">
          <TabsList className="mb-4"><TabsTrigger value="general">Gerais</TabsTrigger><TabsTrigger value="individual">Individuais</TabsTrigger></TabsList>
          {isPending && <p className="text-sm text-muted-foreground">Carregando comunicados…</p>}
          {error && <p className="text-sm text-destructive">Não foi possível carregar os comunicados.</p>}
          {["general", "individual"].map((tab) => <TabsContent key={tab} value={tab} className="space-y-3">
          {data.filter((n) => tab === "general" ? !n.unit_id : Boolean(n.unit_id)).map((n) => (
            <Panel key={n.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">{dateLabel(n.created_at)}</div>
                  {n.unit_id && <div className="mt-1 text-xs font-medium text-primary">{n.units?.identifier ?? "Comunicado individual"}</div>}
                  <h2 className="mt-1 font-semibold">{n.title}</h2>
                </div>
                {isAdmin && <Button variant="outline" size="sm" onClick={() => remove(n.id)}>Excluir</Button>}
              </div>
              {n.body && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground/75">{n.body}</p>}
              {n.unit_id && <Button variant="outline" size="sm" className="mt-3" onClick={() => setConversation(n)}>Ver conversa / Responder</Button>}
            </Panel>
          ))}
          {!isPending && !error && !data.some((n) => tab === "general" ? !n.unit_id : Boolean(n.unit_id)) && <Panel className="text-center text-sm text-muted-foreground">Nenhum comunicado {tab === "general" ? "geral" : "individual"} publicado.</Panel>}
          </TabsContent>)}
        </Tabs>
        {isAdmin && (
          <Panel className="h-fit xl:sticky xl:top-8">
            <h2 className="mb-4 font-semibold">Novo aviso</h2>
            <form onSubmit={publish} className="space-y-3">
              <div className="space-y-1"><Label>Destinatário</Label><Select value={target} onValueChange={setTarget}><SelectTrigger aria-label="Destinatário"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="general">Todas as unidades</SelectItem>{units.map((u) => <SelectItem key={u.id} value={u.id}>{u.identifier} — {u.owner_name}</SelectItem>)}</SelectContent></Select></div>
              <Input aria-label="Título do comunicado" placeholder="Título" maxLength={150} required value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea aria-label="Mensagem do comunicado" placeholder="Mensagem para os condôminos" rows={6} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} />
              <Button type="submit" className="w-full" disabled={saving}>{saving ? "Publicando…" : "Publicar"}</Button>
            </form>
          </Panel>
        )}
      </div>
      {conversation && <NoticeConversation key={conversation.id} notice={conversation} isAdmin={isAdmin} onClose={() => setConversation(null)} />}
    </>
  );
}
