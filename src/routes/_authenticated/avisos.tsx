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

export const Route = createFileRoute("/_authenticated/avisos")({
  head: () => ({ meta: [{ title: "Avisos — Condomio" }] }),
  component: NoticesPage,
});

export function useNotices() {
  return useQuery({
    queryKey: ["notices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notices").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function NoticesPage() {
  const { isAdmin } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data = [] } = useNotices();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return void toast.error("Informe o título");
    const { error } = await supabase.from("notices").insert({ title: title.trim().slice(0, 150), body: body.trim().slice(0, 4000) });
    if (error) return void toast.error(error.message);
    setTitle(""); setBody("");
    toast.success("Aviso publicado");
    qc.invalidateQueries({ queryKey: ["notices"] });
  }
  async function remove(id: string) {
    const { error } = await supabase.from("notices").delete().eq("id", id);
    if (error) return void toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["notices"] });
  }

  return (
    <>
      <PageHeader eyebrow="Comunicados" title="Avisos" />
      <div className={isAdmin ? "grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]" : ""}>
        <div className="space-y-3">
          {data.map((n) => (
            <Panel key={n.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">{dateLabel(n.created_at)}</div>
                  <h2 className="mt-1 font-semibold">{n.title}</h2>
                </div>
                {isAdmin && <Button variant="outline" size="sm" onClick={() => remove(n.id)}>Excluir</Button>}
              </div>
              {n.body && <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/75">{n.body}</p>}
            </Panel>
          ))}
          {data.length === 0 && <Panel className="text-center text-sm text-muted-foreground">Nenhum aviso publicado.</Panel>}
        </div>
        {isAdmin && (
          <Panel className="h-fit xl:sticky xl:top-8">
            <h2 className="mb-4 font-semibold">Novo aviso</h2>
            <form onSubmit={publish} className="space-y-3">
              <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea placeholder="Mensagem para os condôminos" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
              <Button type="submit" className="w-full">Publicar</Button>
            </form>
          </Panel>
        )}
      </div>
    </>
  );
}
