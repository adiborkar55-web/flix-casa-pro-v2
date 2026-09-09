import { encryptData, decryptData, getEncryptionSecret } from "./crypto";
export async function setEncryptedItem(key, value, accountId) {
    const scopedKey = `flixcasa:${accountId}:${key}`;
    const secret = getEncryptionSecret();
    const encrypted = await encryptData(JSON.stringify(value), secret);
    localStorage.setItem(scopedKey, encrypted);
}
export async function getEncryptedItem(key, accountId) {
    const scopedKey = `flixcasa:${accountId}:${key}`;
    const raw = localStorage.getItem(scopedKey);
    if (!raw)
        return null;
    try {
        const secret = getEncryptionSecret();
        const decrypted = await decryptData(raw, secret);
        return JSON.parse(decrypted);
    }
    catch (_a) {
        return null;
    }
}
export function removeEncryptedItem(key, accountId) {
    localStorage.removeItem(`flixcasa:${accountId}:${key}`);
}
export function clearAccountData(accountId) {
    const prefix = `flixcasa:${accountId}:`;
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k === null || k === void 0 ? void 0 : k.startsWith(prefix))
            keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
}
