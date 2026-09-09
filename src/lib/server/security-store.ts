import { randomBytes } from "node:crypto";
import { clearInstanceLogs, normalizeInstance, updateInstanceState, type AppInstance } from "@/lib/server/instance-store";

interface SecurityState {
  lockdown: boolean;
  events: string[];
  encryptionKey: string;
}

const state: Record<AppInstance, SecurityState> = {
  unified: { lockdown: false, events: [], encryptionKey: randomBytes(32).toString("hex") },
};

export function getSecurityState(instance: string | null | undefined) {
  return state[normalizeInstance(instance)];
}

export async function triggerLockdown(instance: string | null | undefined, reason: string) {
  const key = normalizeInstance(instance);
  state[key].lockdown = true;
  state[key].events = [`${new Date().toISOString()} ${reason}`, ...state[key].events].slice(0, 100);
  await updateInstanceState(key, { logs: state[key].events });
  return state[key];
}

export async function secureReboot(instance: string | null | undefined) {
  const key = normalizeInstance(instance);
  state[key].lockdown = false;
  state[key].encryptionKey = randomBytes(32).toString("hex");
  state[key].events = [];
  await clearInstanceLogs(key);
  return state[key];
}

export function appendSecurityEvent(instance: string | null | undefined, message: string) {
  const key = normalizeInstance(instance);
  state[key].events = [`${new Date().toISOString()} ${message}`, ...state[key].events].slice(0, 100);
  return state[key];
}
