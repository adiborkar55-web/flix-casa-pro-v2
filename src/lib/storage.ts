import { encryptData, decryptData, getEncryptionSecret } from "./crypto";

export async function setEncryptedItem(key: string, value: unknown, accountId: string): Promise<void> {
  const scopedKey = `flixcasa:${accountId}:${key}`;
  const secret = getEncryptionSecret();
  const encrypted = await encryptData(JSON.stringify(value), secret);
  localStorage.setItem(scopedKey, encrypted);
}

export async function getEncryptedItem<T>(key: string, accountId: string): Promise<T | null> {
  const scopedKey = `flixcasa:${accountId}:${key}`;
  const raw = localStorage.getItem(scopedKey);
  if (!raw) return null;
  try {
    const secret = getEncryptionSecret();
    const decrypted = await decryptData(raw, secret);
    return JSON.parse(decrypted) as T;
  } catch {
    return null;
  }
}

export function removeEncryptedItem(key: string, accountId: string): void {
  localStorage.removeItem(`flixcasa:${accountId}:${key}`);
}

export function clearAccountData(accountId: string): void {
  const prefix = `flixcasa:${accountId}:`;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(prefix)) keysToRemove.push(k);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}
