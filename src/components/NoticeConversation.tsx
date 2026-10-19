import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export type ConversationNotice = { id: string; title: string; body: string; unit_id: string | null };

export function NoticeConversation({ notice, isAdmin, onClose }: { notice: ConversationNotice; isAdmin: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { data: messages = [], isPending, error } = useQuery({
    queryKey: ["notice-messages", notice.id],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.from("notice_messages").select("*").eq("notice_id", notice.id).order("created_at");
      if (error) throw error;
      return data;
    },
  });
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || !notice.unit_id) return;
    setSending(true);
    try {
      const { error } = await supabase.from("notice_messages").insert({ notice_id: notice.id, message: message.trim(), from_admin: isAdmin });
      if (error) throw error;
      setMessage("");
      await qc.invalidateQueries({ queryKey: ["notice-messages", notice.id] });
      toast.success("Resposta enviada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a resposta");
    } finally { setSending(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto">
      <DialogHeader><DialogTitle>{notice.title}</DialogTitle><DialogDescription>Comunicado individual · conversa com {isAdmin ? "o condômino" : "a administração"}</DialogDescription></DialogHeader>
      <p className="whitespace-pre-wrap break-words border-b border-border pb-4 text-sm">{notice.body}</p>
      <div className="space-y-3" aria-live="polite">
        {isPending && <p className="text-sm text-muted-foreground">Carregando respostas…</p>}
        {error && <p className="text-sm text-destructive">Não foi possível carregar as respostas.</p>}
        {!isPending && !error && messages.length === 0 && <p className="text-sm text-muted-foreground">Ainda não há respostas.</p>}
        {messages.map((m) => <div key={m.id} className={m.from_admin ? "border-l-2 border-primary pl-3" : "border-l-2 border-border pl-3"}>
          <div className="text-xs text-muted-foreground">{m.from_admin ? "Administração" : "Condômino"} · {new Date(m.created_at).toLocaleString("pt-BR")}</div>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm">{m.message}</p>
        </div>)}
      </div>
      <form onSubmit={send} className="space-y-2">
        <Textarea aria-label="Resposta ao comunicado" placeholder="Escrever resposta…" rows={3} maxLength={4000} value={message} onChange={(e) => setMessage(e.target.value)} />
        <Button type="submit" disabled={sending || !message.trim()}>{sending ? "Enviando…" : "Enviar resposta"}</Button>
      </form>
    </DialogContent>
  </Dialog>;
}