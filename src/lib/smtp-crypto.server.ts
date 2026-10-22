export async function encryptSmtpSettings(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)), "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value)));
  return JSON.stringify({ iv: Array.from(iv), ciphertext: Array.from(ciphertext) });
}

export async function decryptSmtpSettings(value: string, secret: string) {
  const { iv, ciphertext } = JSON.parse(value) as { iv: number[]; ciphertext: number[] };
  const key = await crypto.subtle.importKey("raw", await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)), "AES-GCM", false, ["decrypt"]);
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(iv) }, key, new Uint8Array(ciphertext)));
}