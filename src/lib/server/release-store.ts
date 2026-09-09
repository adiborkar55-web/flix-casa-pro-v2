import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface ReleaseInfo {
  minRequiredVersion: string;
  forceUpdate: boolean;
  message: string;
  stableVersion: string;
  publishedAt: string | null;
  notes: string;
}

const DEFAULT_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0";
const RELEASE_FILE = path.join(process.cwd(), ".data", "release.json");

async function readRelease(): Promise<ReleaseInfo> {
  try {
    const raw = await readFile(RELEASE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<ReleaseInfo>;
    return {
      minRequiredVersion: parsed.minRequiredVersion || DEFAULT_VERSION,
      forceUpdate: parsed.forceUpdate === true,
      message: parsed.message || "Update required to continue",
      stableVersion: parsed.stableVersion || DEFAULT_VERSION,
      publishedAt: parsed.publishedAt || null,
      notes: parsed.notes || "",
    };
  } catch {
    return { minRequiredVersion: DEFAULT_VERSION, forceUpdate: false, message: "Update required to continue", stableVersion: DEFAULT_VERSION, publishedAt: null, notes: "" };
  }
}

export async function getReleaseInfo(): Promise<ReleaseInfo> {
  return readRelease();
}

export async function publishRelease(notes = "") {
  const current = await readRelease();
  const currentParts = current.minRequiredVersion.split(".").map((part) => Number(part) || 0);
  while (currentParts.length < 3) currentParts.push(0);
  currentParts[2] += 1;
  const release: ReleaseInfo = {
    minRequiredVersion: currentParts.join("."),
    forceUpdate: true,
    message: "Update required to continue",
    stableVersion: current.stableVersion || DEFAULT_VERSION,
    publishedAt: new Date().toISOString(),
    notes: notes.trim().slice(0, 500),
  };

  await mkdir(path.dirname(RELEASE_FILE), { recursive: true });
  await writeFile(RELEASE_FILE, JSON.stringify(release, null, 2), "utf8");
  return release;
}

export async function forceUpdateApp(version = "2.1.0", notes = "") {
  const current = await readRelease();
  const release: ReleaseInfo = {
    ...current,
    minRequiredVersion: /^\d+\.\d+\.\d+$/.test(version) ? version : "2.1.0",
    forceUpdate: true,
    message: "Update required to continue",
    publishedAt: new Date().toISOString(),
    notes: notes.trim().slice(0, 500),
  };
  await mkdir(path.dirname(RELEASE_FILE), { recursive: true });
  await writeFile(RELEASE_FILE, JSON.stringify(release, null, 2), "utf8");
  return release;
}

export async function rollbackRelease() {
  const current = await readRelease();
  const release: ReleaseInfo = {
    ...current,
    minRequiredVersion: current.stableVersion || DEFAULT_VERSION,
    forceUpdate: false,
    message: "",
    publishedAt: new Date().toISOString(),
  };
  await mkdir(path.dirname(RELEASE_FILE), { recursive: true });
  await writeFile(RELEASE_FILE, JSON.stringify(release, null, 2), "utf8");
  return release;
}
