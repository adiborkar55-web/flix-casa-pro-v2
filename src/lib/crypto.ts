const ALGO = "AES-GCM";
const KEY_LENGTH = 256;

async function deriveKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret.padEnd(32, "0").slice(0, 32)),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("flixcasa-salt-v2"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: ALGO, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptData(plaintext: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const cipher = await crypto.subtle.encrypt({ name: ALGO, iv }, key, enc.encode(plaintext));
  const combined = new Uint8Array(iv.length + cipher.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(cipher), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptData(ciphertext: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const plain = await crypto.subtle.decrypt({ name: ALGO, iv }, key, data);
  return new TextDecoder().decode(plain);
}

export function getEncryptionSecret(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("flixcasa_device_id");
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem("flixcasa_device_id", id);
    return id;
  }
  return process.env.ENCRYPTION_SECRET || "flixcasa-server-default-key-32b";
}
