import type { SmtpSettings } from "./smtp-config";
import { isPublicIpv4 } from "./smtp-config";

export async function sendSmtp(settings: SmtpSettings, to: string, subject: string, text: string) {
  const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(settings.host)}&type=A`, { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("SMTP indisponível");
  const dns = await response.json() as { Answer?: { type: number; data: string }[] };
  const addresses = dns.Answer?.filter((a) => a.type === 1).map((a) => a.data) ?? [];
  if (!addresses.length || addresses.some((ip) => !isPublicIpv4(ip))) throw new Error("Servidor SMTP inválido");
  if (import.meta.env.DEV) {
    const { default: nodemailer } = await import("nodemailer");
    const transport = nodemailer.createTransport({ host: addresses[0], port: 465, secure: true, auth: { user: settings.username, pass: settings.password }, tls: { servername: settings.host, rejectUnauthorized: true }, logger: false, debug: false, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 });
    try { await transport.sendMail({ from: { name: settings.fromName, address: settings.fromEmail }, to, subject, text }); }
    finally { transport.close(); }
  } else {
    const { WorkerMailer, LogLevel } = await import("@workermailer/smtp");
    await WorkerMailer.send({ host: settings.host, port: 465, secure: true, startTls: false, credentials: { username: settings.username, password: settings.password }, authType: ["plain", "login"], logLevel: LogLevel.NONE, socketTimeoutMs: 10000, responseTimeoutMs: 15000 }, { from: { name: settings.fromName, email: settings.fromEmail }, to, subject, text });
  }
}