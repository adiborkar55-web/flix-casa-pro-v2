import type { GoogleAccount } from "@/types";
import { createHash, timingSafeEqual } from "node:crypto";

const accounts = new Map<string, GoogleAccount>();
const sessions = new Map<string, { accountId: string; lastActive: number; ip?: string; userAgent?: string; createdAt: string }>();
const blockedIps = new Set<string>();
const credentials = new Map<string, string>();
const passwordResetOtps = new Map<string, { codeHash: string; expiresAt: number }>();

const ROOT_ADMIN_EMAIL = process.env.ROOT_ADMIN_EMAIL || "admin@flixcasa.local";

export function getOrCreateAccount(email: string, name: string, picture?: string): GoogleAccount {
  const existing = Array.from(accounts.values()).find((a) => a.email === email);
  if (existing) {
    existing.isOnline = true;
    existing.lastSeen = new Date().toISOString();
    return existing;
  }

  const isRootAdmin = email.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase();
  const account: GoogleAccount = {
    id: crypto.randomUUID(),
    email,
    name,
    picture,
    isOnline: true,
    lastSeen: new Date().toISOString(),
    isBlocked: false,
    isRootAdmin,
  };
  accounts.set(account.id, account);
  return account;
}

export function addAccount(email: string, name: string): GoogleAccount {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = Array.from(accounts.values()).find((account) => account.email.toLowerCase() === normalizedEmail);
  if (existing) return existing;
  const account: GoogleAccount = {
    id: crypto.randomUUID(), email: normalizedEmail, name: name.trim() || normalizedEmail,
    isOnline: false, lastSeen: new Date().toISOString(), isBlocked: false, isRootAdmin: false,
  };
  accounts.set(account.id, account);
  return account;
}

function passwordDigest(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export function setAccountPassword(email: string, password: string): void {
  credentials.set(email.trim().toLowerCase(), passwordDigest(password));
}

export function hasAccountPassword(email: string): boolean {
  return credentials.has(email.trim().toLowerCase());
}

export function verifyAccountPassword(email: string, password: string): boolean {
  const expected = credentials.get(email.trim().toLowerCase());
  if (!expected) return false;
  const actual = Buffer.from(passwordDigest(password));
  const target = Buffer.from(expected);
  return actual.length === target.length && timingSafeEqual(actual, target);
}

export function issuePasswordReset(email: string, code: string, ttlMs = 10 * 60 * 1000): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  if (!Array.from(accounts.values()).some((account) => account.email.toLowerCase() === normalizedEmail)) return false;
  passwordResetOtps.set(normalizedEmail, { codeHash: passwordDigest(code), expiresAt: Date.now() + ttlMs });
  return true;
}

export function verifyPasswordReset(email: string, code: string): boolean {
  const entry = passwordResetOtps.get(email.trim().toLowerCase());
  if (!entry || entry.expiresAt < Date.now()) return false;
  const actual = Buffer.from(passwordDigest(code));
  const expected = Buffer.from(entry.codeHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function resetAccountPassword(email: string, code: string, password: string): boolean {
  if (!verifyPasswordReset(email, code)) return false;
  setAccountPassword(email, password);
  passwordResetOtps.delete(email.trim().toLowerCase());
  return true;
}

export function getAllAccounts(): GoogleAccount[] {
  return Array.from(accounts.values()).map((a) => ({
    ...a,
    isOnline: isSessionActive(a.id),
  }));
}

export function getAccount(id: string): GoogleAccount | undefined {
  const account = accounts.get(id);
  if (!account) return undefined;
  return { ...account, isOnline: isSessionActive(id) };
}

export function blockAccount(id: string): boolean {
  const account = accounts.get(id);
  if (!account || account.isRootAdmin) return false;
  account.isBlocked = true;
  account.isOnline = false;
  revokeAllSessions(id);
  return true;
}

export function canManageAccount(id: string): boolean {
  const account = accounts.get(id);
  return !!account && !account.isRootAdmin;
}

export function unblockAccount(id: string): boolean {
  const account = accounts.get(id);
  if (!account) return false;
  account.isBlocked = false;
  return true;
}

export function revokeAllSessions(accountId: string): void {
  for (const [token, session] of sessions.entries()) {
    if (session.accountId === accountId) sessions.delete(token);
  }
  const account = accounts.get(accountId);
  if (account) account.isOnline = false;
}

export function registerSession(token: string, accountId: string, ip?: string, userAgent?: string): void {
  sessions.set(token, { accountId, lastActive: Date.now(), ip, userAgent, createdAt: new Date().toISOString() });
  const account = accounts.get(accountId);
  if (account) {
    account.isOnline = true;
    account.lastSeen = new Date().toISOString();
  }
}

export function touchSession(token: string): void {
  const session = sessions.get(token);
  if (session) session.lastActive = Date.now();
}

export function isSessionActive(accountId: string): boolean {
  const fiveMin = 5 * 60 * 1000;
  const now = Date.now();
  for (const session of sessions.values()) {
    if (session.accountId === accountId && now - session.lastActive < fiveMin) return true;
  }
  return false;
}

export function getAccountMetadata(id: string): Pick<GoogleAccount, "id" | "email" | "name" | "isOnline" | "lastSeen" | "isBlocked" | "isRootAdmin"> | null {
  const account = accounts.get(id);
  if (!account) return null;
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    isOnline: isSessionActive(id),
    lastSeen: account.lastSeen,
    isBlocked: account.isBlocked,
    isRootAdmin: account.isRootAdmin,
  };
}

export function revokeSession(token: string): boolean {
  if (!sessions.has(token)) return false;
  sessions.delete(token);
  return true;
}

export function blockIp(ip: string): boolean {
  if (!ip.trim()) return false;
  blockedIps.add(ip.trim());
  for (const [token, session] of sessions.entries()) {
    if (session.ip === ip.trim()) sessions.delete(token);
  }
  return true;
}

export function isIpBlocked(ip: string): boolean {
  return blockedIps.has(ip.trim());
}

export function getAllSessions() {
  return Array.from(sessions.entries()).map(([token, s]) => {
    const acc = accounts.get(s.accountId);
    return {
      token,
      accountId: s.accountId,
      accountEmail: acc?.email || null,
      accountName: acc?.name || null,
      ip: s.ip,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      lastActive: s.lastActive,
    };
  });
}
