import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface SourceControl {
  id: string;
  label: string;
  url: string;
  enabled: boolean;
  priority: number;
}

export interface CatalogControl {
  pages: number;
  region: string;
  language: string;
  indianLanguage: string;
}

export interface ControlConfig {
  sources: SourceControl[];
  catalog: CatalogControl;
  updatedAt: string | null;
}

const CONTROL_FILE = path.join(process.cwd(), ".data", "controls.json");
const DEFAULT_CONFIG: ControlConfig = {
  sources: [
    { id: "netmirror", label: "NetMirror", url: "https://i-api.aoneroom.com", enabled: true, priority: 1 },
    { id: "moviebox", label: "MovieBox", url: "https://api.moviebox.com", enabled: true, priority: 2 },
    { id: "direct", label: "Direct Scrapers", url: "", enabled: true, priority: 3 },
    { id: "backup", label: "Backup Embeds", url: "", enabled: true, priority: 6 },
  ],
  catalog: { pages: 5, region: "US", language: "en-US", indianLanguage: "hi-IN" },
  updatedAt: null,
};

export async function getControlConfig(): Promise<ControlConfig> {
  try {
    const parsed = JSON.parse(await readFile(CONTROL_FILE, "utf8")) as Partial<ControlConfig>;
    return {
      sources: Array.isArray(parsed.sources) ? parsed.sources : DEFAULT_CONFIG.sources,
      catalog: { ...DEFAULT_CONFIG.catalog, ...(parsed.catalog || {}) },
      updatedAt: parsed.updatedAt || null,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function updateControlConfig(update: Partial<ControlConfig>): Promise<ControlConfig> {
  const current = await getControlConfig();
  const next: ControlConfig = {
    sources: Array.isArray(update.sources) ? update.sources : current.sources,
    catalog: { ...current.catalog, ...(update.catalog || {}) },
    updatedAt: new Date().toISOString(),
  };
  await mkdir(path.dirname(CONTROL_FILE), { recursive: true });
  await writeFile(CONTROL_FILE, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function defaultControlConfig(): ControlConfig {
  return DEFAULT_CONFIG;
}