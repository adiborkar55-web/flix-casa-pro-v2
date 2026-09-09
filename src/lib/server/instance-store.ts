import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type AppInstance = "unified";

export interface InstanceUser {
  id: string;
  name: string;
  email: string;
  appVersion: string;
  ip?: string;
  userAgent?: string;
  loggedInAt: string;
  lastSeen: string;
  blocked: boolean;
}

export interface InstanceState {
  users: InstanceUser[];
  logs: string[];
  bandwidthMb: number;
  settings: { streamQuality: string; audioPriority: string };
}

const FILE = path.join(process.cwd(), ".data", "instances.json");
const defaults = (): Record<AppInstance, InstanceState> => ({
  unified: { users: [], logs: [], bandwidthMb: 0, settings: { streamQuality: "auto", audioPriority: "auto" } },
});

function validInstance(value: unknown): AppInstance {
  void value;
  return "unified";
}

async function readStates() {
  try {
    const parsed = JSON.parse(await readFile(FILE, "utf8")) as Record<string, Partial<InstanceState>>;
    const fallback = defaults();
    const legacy = parsed.free || parsed.paid || {};
    return { unified: { ...fallback.unified, ...legacy, settings: { ...fallback.unified.settings, ...(legacy.settings || {}) } } } as Record<AppInstance, InstanceState>;
  } catch {
    return defaults();
  }
}

async function writeStates(states: Record<AppInstance, InstanceState>) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(states, null, 2), "utf8");
}

export async function getInstanceState(instance: string | null | undefined) {
  const states = await readStates();
  return states[validInstance(instance)];
}

export async function updateInstanceState(instance: string | null | undefined, update: Partial<InstanceState>) {
  const states = await readStates();
  const key = validInstance(instance);
  states[key] = { ...states[key], ...update, settings: { ...states[key].settings, ...(update.settings || {}) } };
  await writeStates(states);
  return states[key];
}

export async function clearInstanceLogs(instance: string | null | undefined) {
  return updateInstanceState(instance, { logs: [] });
}

export async function registerInstanceUser(instance: string | null | undefined, user: Omit<InstanceUser, "loggedInAt" | "lastSeen" | "blocked">) {
  const state = await getInstanceState(instance);
  const now = new Date().toISOString();
  const existing = state.users.find((entry) => entry.id === user.id);
  const nextUser: InstanceUser = { ...user, loggedInAt: existing?.loggedInAt || now, lastSeen: now, blocked: existing?.blocked || false };
  const users = existing ? state.users.map((entry) => entry.id === user.id ? nextUser : entry) : [nextUser, ...state.users];
  await updateInstanceState(instance, { users });
  return nextUser;
}

export async function setInstanceUserBlocked(instance: string | null | undefined, userId: string, blocked: boolean) {
  const state = await getInstanceState(instance);
  await updateInstanceState(instance, { users: state.users.map((user) => user.id === userId ? { ...user, blocked } : user) });
  return getInstanceState(instance);
}

export function normalizeInstance(value: string | null | undefined): AppInstance {
  return validInstance(value);
}
