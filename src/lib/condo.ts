import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

export type Unit = Database["public"]["Tables"]["units"]["Row"];
export type Consumption = Database["public"]["Tables"]["consumption"]["Row"];
export type ServiceOrder = Database["public"]["Tables"]["service_orders"]["Row"];
export type OsMessage = Database["public"]["Tables"]["os_messages"]["Row"];
export type UnitType = Database["public"]["Enums"]["unit_type"];
export type OsStatus = Database["public"]["Enums"]["os_status"];
export type OsPriority = Database["public"]["Enums"]["os_priority"];

export const unitTypeLabel: Record<UnitType, string> = {
  galpao: "Galpão",
  sala_comercial: "Sala Comercial",
  residencial: "Residencial",
};

export const statusLabel: Record<OsStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};
export const statusClass: Record<OsStatus, string> = {
  pendente: "bg-highlight/15 text-highlight",
  em_andamento: "bg-primary/15 text-primary",
  concluido: "bg-success/15 text-success",
  cancelado: "bg-muted text-muted-foreground",
};

export const priorityLabel: Record<OsPriority, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };
export const priorityClass: Record<OsPriority, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-primary/10 text-primary",
  alta: "bg-destructive/10 text-destructive",
};

export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
export const monthLabel = (d: string) => {
  const [y, m] = d.split("-");
  const s = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
export const dateLabel = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

export async function uploadAnexo(unitId: string, file: File, prefix: string) {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${unitId}/${prefix}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("anexos").upload(path, file);
  if (error) throw error;
  return path;
}

export async function openAnexo(path: string) {
  const { data, error } = await supabase.storage.from("anexos").createSignedUrl(path, 300);
  if (error || !data) throw error ?? new Error("Arquivo indisponível");
  window.open(data.signedUrl, "_blank", "noopener");
}
