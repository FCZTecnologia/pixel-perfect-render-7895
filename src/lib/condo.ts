import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { dueDateLabel } from "./billing";

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

export const LOGIN_DOMAIN = "condomio.app";
export const toLoginEmail = (v: string) => {
  const s = v.trim().toLowerCase();
  return s.includes("@") ? s : `${s}@${LOGIN_DOMAIN}`;
};

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

export async function exportUnitReport(unit: Unit) {
  const [c, o, s, notices] = await Promise.all([
    supabase.from("consumption_bills").select("*").eq("unit_id", unit.id).order("reference_month").order("kind"),
    supabase.from("service_orders").select("*, os_messages(*)").eq("unit_id", unit.id).order("created_at"),
    supabase.from("suggestions").select("*").eq("unit_id", unit.id).order("created_at"),
    supabase.from("notices").select("*, notice_messages(*)").eq("unit_id", unit.id).order("created_at"),
  ]);
  if (c.error) throw c.error;
  if (o.error) throw o.error;
  if (s.error) throw s.error;
  if (notices.error) throw notices.error;
  const row = (cells: unknown[]) => `<tr>${cells.map((x) => `<td>${esc(x)}</td>`).join("")}</tr>`;
  const head = (cells: string[]) => `<tr>${cells.map((x) => `<th>${x}</th>`).join("")}</tr>`;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Encerramento ${esc(unit.identifier)}</title>
<style>body{font-family:system-ui,sans-serif;margin:32px;color:#111}table{border-collapse:collapse;width:100%;margin:8px 0 24px;font-size:13px}td,th{border:1px solid #ccc;padding:6px;text-align:left;vertical-align:top}th{background:#f2f2f2}h1{margin-bottom:4px}</style></head><body>
<h1>Relatório de encerramento de contrato</h1>
<p>Gerado em ${esc(new Date().toLocaleString("pt-BR"))}</p>
<h2>Unidade</h2><table>
${row(["Identificação", unit.identifier])}${row(["Tipo", unitTypeLabel[unit.unit_type]])}${row(["Condômino / Empresa", unit.owner_name])}
${row(["CPF / CNPJ", unit.document])}${row(["E-mail", unit.email])}${row(["Telefone", unit.phone])}${row(["Usuário de acesso", unit.username])}
${row(["Início do vínculo", dateLabel(unit.created_at)])}${row(["Encerramento", new Date().toLocaleDateString("pt-BR")])}</table>
<h2>Consumo (${c.data.length})</h2><table>${head(["Mês", "Tipo", "Leitura ant.", "Leitura atual", "Consumo", "Valor", "Vencimento", "Pagamento"])}
${c.data.map((r) => row([monthLabel(r.reference_month), utilityLabel[r.kind], num(r.reading_prev), num(r.reading_curr), `${num(r.reading_curr - r.reading_prev)} ${utilityUnit[r.kind]}`, brl(r.amount), r.due_date ? dueDateLabel(r.due_date) : "Não informado", r.paid_at ? `Pago em ${dateLabel(r.paid_at)}` : "Em aberto"])).join("")}</table>
<h2>Ordens de serviço (${o.data.length})</h2>
${o.data.map((x) => `<h3>OS-${x.number} · ${esc(x.title)}</h3><table>${row(["Aberta em", dateLabel(x.created_at)])}${row(["Categoria", x.category])}${row(["Prioridade", priorityLabel[x.priority]])}${row(["Status", statusLabel[x.status]])}${row(["Descrição", x.description])}</table>
${x.os_messages?.length ? `<table>${head(["Data", "Autor", "Mensagem"])}${[...x.os_messages].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((m) => row([new Date(m.created_at).toLocaleString("pt-BR"), m.from_admin ? "Administração" : "Condômino", m.message])).join("")}</table>` : ""}`).join("")}
<h2>Sugestões (${s.data.length})</h2><table>${head(["Data", "Mensagem"])}${s.data.map((x) => row([new Date(x.created_at).toLocaleString("pt-BR"), x.message])).join("")}</table>
<h2>Comunicados individuais (${notices.data.length})</h2>${notices.data.map((n) => `<h3>${esc(n.title)}</h3><p>${esc(n.body)}</p><table>${head(["Data", "Autor", "Resposta"])}${[...n.notice_messages].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((m) => row([new Date(m.created_at).toLocaleString("pt-BR"), m.from_admin ? "Administração" : "Condômino", m.message])).join("")}</table>`).join("")}
</body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `encerramento-${unit.identifier.replace(/\W+/g, "-")}-${new Date().toISOString().slice(0, 10)}.html`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export type Bill = Database["public"]["Tables"]["consumption_bills"]["Row"];
export type UtilityKind = Database["public"]["Enums"]["utility_kind"];
export const utilityKinds: UtilityKind[] = ["energia", "agua", "climatizacao"];
export const utilityLabel: Record<UtilityKind, string> = { energia: "Eletricidade", agua: "Água/Gás", climatizacao: "Climatização" };
export const utilityUnit: Record<UtilityKind, string> = { energia: "kWh", agua: "m³", climatizacao: "kWh" };
