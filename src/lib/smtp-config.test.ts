import { test } from "node:test";
import { strict as assert } from "node:assert";
import { notificationRecipient, publicSmtpSettings, smtpSettingsSchema, isPublicIpv4 } from "./smtp-config";

test("notifications go to the unit contact email, not its synthetic login", () => {
  assert.equal(notificationRecipient({ active: true, terminated_at: null, email: "responsavel@example.com" }), "responsavel@example.com");
});
test("inactive and terminated units receive no notifications", () => {
  assert.equal(notificationRecipient({ active: false, terminated_at: null, email: "contact@example.com" }), null);
  assert.equal(notificationRecipient({ active: true, terminated_at: "2026-10-21T11:39:00Z", email: "contact@example.com" }), null);
});
test("SMTP settings returned to the browser never contain a password", () => {
  const settings = publicSmtpSettings({ host: "smtp.example.com", port: 465, username: "test", password: "fake-test-value", fromEmail: "test@example.com", fromName: "Test", enabled: true, notifyBills: true, notifyNotices: true });
  assert.equal("password" in settings, false);
  assert.equal(settings.passwordSet, true);
});
test("SMTP requires encrypted port 465 and rejects protocol injection", () => {
  const valid = { host: "smtp.example.com", port: 465, username: "test", password: "fake-test-value", fromEmail: "test@example.com", fromName: "Test", enabled: true, notifyBills: true, notifyNotices: true };
  assert.equal(smtpSettingsSchema.safeParse(valid).success, true);
  assert.equal(smtpSettingsSchema.safeParse({ ...valid, port: 25 }).success, false);
  assert.equal(smtpSettingsSchema.safeParse({ ...valid, fromName: "Test\r\nBcc: other@example.com" }).success, false);
});
test("SMTP connections cannot target local or private IPv4 networks", () => {
  for (const ip of ["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1"]) assert.equal(isPublicIpv4(ip), false);
  assert.equal(isPublicIpv4("8.8.8.8"), true);
});