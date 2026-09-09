export interface PlayerServerConfig {
  label: string;
  url: string;
  autoplay?: boolean;
  lang?: string;
}

export interface PlayerRemoteConfig {
  servers?: PlayerServerConfig[];
  autoplay?: boolean;
  defaultLanguage?: string;
  autoSwitch?: boolean;
  adBlocking?: boolean;
  audioHint?: string;
  audioOptions?: string[];
}

const DEFAULT_PLAYER_SERVERS: PlayerServerConfig[] = [
  { label: "Server 1 - Primary HD", url: "https://vidsrc.pro/embed/movie/${tmdbId}", autoplay: true, lang: "hi" },
  { label: "Server 2 - VidSrc VIP", url: "https://vidsrc.me/embed/movie?tmdb=${tmdbId}", autoplay: true, lang: "hi" },
  { label: "Server 3 - 2Embed Fast", url: "https://www.2embed.cc/embed/${tmdbId}", autoplay: true, lang: "hi" },
  { label: "Server 4 - SuperEmbed", url: "https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1", autoplay: true, lang: "hi" },
  { label: "Server 5 - SmashyStream", url: "https://player.smashy.stream/movie/${tmdbId}", autoplay: true, lang: "hi" },
];

function interpolateUrl(url: string, tmdbId: string) {
  return url.replace(/\$\{tmdbId\}/g, tmdbId);
}

function normalizeRemoteConfig(raw: Partial<PlayerRemoteConfig> | null | undefined): PlayerRemoteConfig {
  const fallbackServers = DEFAULT_PLAYER_SERVERS.map((server) => ({ ...server }));
  const servers = Array.isArray(raw?.servers)
    ? raw.servers
        .filter((server): server is PlayerServerConfig => Boolean(server?.url))
        .map((server) => ({
          label: server.label || "Remote Server",
          url: server.url,
          autoplay: server.autoplay ?? true,
          lang: server.lang || "hi",
        }))
    : fallbackServers;

  return {
    servers,
    autoplay: raw?.autoplay ?? true,
    defaultLanguage: raw?.defaultLanguage || "hi",
    autoSwitch: raw?.autoSwitch ?? true,
    adBlocking: raw?.adBlocking ?? true,
    audioHint: raw?.audioHint || "Hindi default. Alternate tracks may be available in the player menu.",
    audioOptions: raw?.audioOptions?.length ? raw.audioOptions : ["Hindi", "Marathi", "English"],
  };
}

export function buildDefaultPlayerServers(tmdbId: string): PlayerServerConfig[] {
  return DEFAULT_PLAYER_SERVERS.map((server) => ({
    ...server,
    url: interpolateUrl(server.url, tmdbId),
  }));
}

export function resolvePlayerServers(tmdbId: string, remoteConfig?: PlayerRemoteConfig | null): PlayerServerConfig[] {
  const configuredServers = remoteConfig?.servers?.filter((server) => Boolean(server?.url));
  const defaultLanguage = remoteConfig?.defaultLanguage ?? "hi";
  if (configuredServers?.length) {
    return configuredServers.map((server) => ({
      label: server.label || "Remote Server",
      url: interpolateUrl(server.url, tmdbId),
      autoplay: server.autoplay ?? true,
      lang: server.lang || defaultLanguage,
    }));
  }

  return buildDefaultPlayerServers(tmdbId);
}

export async function getPlayerRemoteConfig(): Promise<PlayerRemoteConfig> {
  const remoteUrl = process.env.NEXT_PUBLIC_PLAYER_CONFIG_URL?.trim();
  const configUrl = remoteUrl || "/api/stream/config";

  try {
    const response = await fetch(configUrl, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Remote config failed: ${response.status}`);
    }

    const data = (await response.json()) as Partial<PlayerRemoteConfig>;
    return normalizeRemoteConfig(data);
  } catch {
    return normalizeRemoteConfig(null);
  }
}
