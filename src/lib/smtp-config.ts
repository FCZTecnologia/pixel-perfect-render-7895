import { z } from "zod";

export const smtpSettingsSchema = z.object({
  host: z.string().trim().toLowerCase().max(253).regex(/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/, "Informe o servidor SMTP, sem https://"),
  port: z.literal(465),
  username: z.string().trim().min(1).max(255).refine((s) => !/[\r\n]/.test(s)),
  password: z.string().max(1024),
  fromEmail: z.string().trim().email().max(255),
  fromName: z.string().trim().min(1).max(120).refine((s) => !/[\r\n]/.test(s)),
  enabled: z.boolean(),
  notifyBills: z.boolean(),
  notifyNotices: z.boolean(),
});
export type SmtpSettings = z.infer<typeof smtpSettingsSchema>;
export type PublicSmtpSettings = Omit<SmtpSettings, "password"> & { passwordSet: boolean };
export const defaultSmtpSettings: PublicSmtpSettings = {
  host: "", port: 465, username: "", fromEmail: "", fromName: "Painel Bandeiras Empresarial",
  enabled: false, notifyBills: true, notifyNotices: true, passwordSet: false,
};

export function publicSmtpSettings(settings: SmtpSettings): PublicSmtpSettings {
  const { password, ...rest } = settings;
  return { ...rest, passwordSet: Boolean(password) };
}

export function notificationRecipient(unit: { active: boolean; terminated_at: string | null; email: string }): string | null {
  if (!unit.active || unit.terminated_at) return null;
  const email = z.string().email().safeParse(unit.email.trim());
  return email.success ? email.data : null;
}

export function isPublicIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;
  return a !== 0 && a !== 10 && a !== 127 && a !== 169 && a !== undefined && a < 224
    && !(a === 172 && b !== undefined && b >= 16 && b <= 31)
    && !(a === 192 && (b === 168 || b === 0)) && !(a === 100 && b !== undefined && b >= 64 && b <= 127)
    && !(a === 198 && (b === 18 || b === 19));
}

export type NotificationResult = { sent: number; failed: number; skipped: boolean };