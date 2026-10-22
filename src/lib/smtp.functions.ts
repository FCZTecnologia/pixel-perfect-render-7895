import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { smtpSettingsSchema, defaultSmtpSettings, publicSmtpSettings, notificationRecipient, type SmtpSettings, type NotificationResult } from "./smtp-config";
import { decryptSmtpSettings, encryptSmtpSettings } from "./smtp-crypto.server";
import { sendSmtp } from "./smtp-transport.server";

const SETTINGS_PATH = "system/smtp-settings.enc";
async function readSettings(storage: { download: (path: string) => Promise<{ data: Blob | null; error: unknown }> }, secret: string): Promise<SmtpSettings | null> {
  const { data, error } = await storage.download(SETTINGS_PATH);
  if (error || !data) return null;
  return smtpSettingsSchema.parse(JSON.parse(await decryptSmtpSettings(await data.text(), secret)));
}

export const getSmtpSettings = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!allowed) throw new Error("Acesso negado");
  const secret = process.env["SMTP_SETTINGS_ENCRYPTION_KEY"];
  if (!secret) throw new Error("Proteção de SMTP indisponível");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const settings = await readSettings(supabaseAdmin.storage.from("anexos"), secret);
  return settings ? publicSmtpSettings(settings) : defaultSmtpSettings;
});

export const saveSmtpSettings = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => smtpSettingsSchema.parse(d)).handler(async ({ data, context }) => {
  const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!allowed) throw new Error("Acesso negado");
  const secret = process.env["SMTP_SETTINGS_ENCRYPTION_KEY"];
  if (!secret) throw new Error("Proteção de SMTP indisponível");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const storage = supabaseAdmin.storage.from("anexos");
  const previous = await readSettings(storage, secret);
  const settings = { ...data, password: data.password || previous?.password || "" };
  if (!settings.password) throw new Error("Informe a senha SMTP");
  const encrypted = await encryptSmtpSettings(JSON.stringify(settings), secret);
  const { error } = await storage.upload(SETTINGS_PATH, new Blob([encrypted], { type: "application/octet-stream" }), { upsert: true });
  if (error) throw new Error("Não foi possível salvar o SMTP");
  return publicSmtpSettings(settings);
});

export const testSmtp = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({ unitId: z.string().uuid() }).parse(d)).handler(async ({ data, context }) => {
  const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!allowed) throw new Error("Acesso negado");
  const { data: unit, error } = await context.supabase.from("units").select("email, identifier, active, terminated_at").eq("id", data.unitId).single();
  if (error || !unit) throw new Error("Unidade não encontrada");
  const to = notificationRecipient(unit);
  if (!to) throw new Error("Unidade inativa ou e-mail inválido");
  const secret = process.env["SMTP_SETTINGS_ENCRYPTION_KEY"];
  if (!secret) throw new Error("Proteção de SMTP indisponível");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const settings = await readSettings(supabaseAdmin.storage.from("anexos"), secret);
  if (!settings) throw new Error("Salve a configuração SMTP primeiro");
  try { await sendSmtp(settings, to, "Teste de e-mail — Painel Bandeiras Empresarial", `Teste de envio para a unidade ${unit.identifier}.\nA configuração SMTP está funcionando.`); }
  catch { throw new Error("Não foi possível enviar. Confira servidor, usuário, senha e permissão de conexão externa no seu provedor."); }
  return { sent: true };
});

export const notifyUnitEvent = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({ event: z.enum(["bill", "notice"]), id: z.string().uuid() }).parse(d)).handler(async ({ data, context }): Promise<NotificationResult> => {
  const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!allowed) throw new Error("Acesso negado");
  const secret = process.env["SMTP_SETTINGS_ENCRYPTION_KEY"];
  if (!secret) return { sent: 0, failed: 1, skipped: false };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const storage = supabaseAdmin.storage.from("anexos");
  const settings = await readSettings(storage, secret);
  if (!settings?.enabled || (data.event === "bill" ? !settings.notifyBills : !settings.notifyNotices)) return { sent: 0, failed: 0, skipped: true };
  let unitId: string | null;
  let subject: string;
  let text: string;
  if (data.event === "bill") {
    const { data: bill, error } = await context.supabase.from("consumption_bills").select("*").eq("id", data.id).single();
    if (error || !bill) throw new Error("Conta não encontrada");
    unitId = bill.unit_id;
    const kinds = { energia: "Eletricidade", agua: "Água/Gás", climatizacao: "Climatização" };
    subject = `Nova conta de ${kinds[bill.kind]} — Bandeiras Empresarial`;
    text = `Uma conta de ${kinds[bill.kind]} foi lançada.\nReferência: ${bill.reference_month.slice(0, 7)}\nValor: ${bill.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}\nVencimento: ${bill.due_date ? bill.due_date.split("-").reverse().join("/") : "Não informado"}\nConsulte os detalhes e o anexo no painel.`;
  } else {
    const { data: notice, error } = await context.supabase.from("notices").select("*").eq("id", data.id).single();
    if (error || !notice) throw new Error("Aviso não encontrado");
    unitId = notice.unit_id;
    subject = `Novo aviso — Bandeiras Empresarial`;
    text = `${notice.title}\n\n${notice.body}\n\nConsulte o painel para acompanhar o comunicado.`;
  }
  let query = context.supabase.from("units").select("id, email, identifier, active, terminated_at").eq("active", true).is("terminated_at", null);
  if (unitId) query = query.eq("id", unitId);
  const { data: units, error } = await query;
  if (error) throw new Error("Não foi possível consultar os destinatários");
  let sent = 0; let failed = 0;
  for (const unit of units ?? []) {
    const to = notificationRecipient(unit);
    if (!to) { failed++; continue; }
    const marker = `system/smtp-sent/${data.event}-${data.id}-${unit.id}.json`;
    const existing = await storage.download(marker);
    if (existing.data) continue;
    try {
      await sendSmtp(settings, to, subject, `Unidade: ${unit.identifier}\n\n${text}`);
      sent++;
      await storage.upload(marker, new Blob([JSON.stringify({ sentAt: new Date().toISOString() })], { type: "application/json" }), { upsert: true });
    } catch { failed++; }
  }
  return { sent, failed, skipped: false };
});