export type StreamMediaType = "movie" | "tv";

export interface StreamSource {
  url: string;
  label: string;
  tier?: "embed";
  hasHindiAudio?: boolean;
  quality?: number;
  seeders?: number;
  verified?: boolean;
}

const BLOCKED_STREAM_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
const BLOCKED_STREAM_SCHEMES = /^(?:javascript|data|file|blob|about):/i;
const TRACKING_QUERY_KEYS = /^(?:utm_|fbclid$|gclid$|msclkid$|telemetry$|tracking$)/i;

export function isSafeStreamUrl(value: string | null | undefined): boolean {
  const normalized = normalizeStreamUrl(value);
  if (!normalized || BLOCKED_STREAM_SCHEMES.test(normalized)) return false;
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    if (parsed.username || parsed.password || BLOCKED_STREAM_HOSTS.has(parsed.hostname.toLowerCase())) return false;
    for (const key of parsed.searchParams.keys()) {
      if (TRACKING_QUERY_KEYS.test(key)) parsed.searchParams.delete(key);
    }
    return true;
  } catch {
    return false;
  }
}

const STREAM_CACHE_TTL_MS = 30 * 60 * 1000;
const STREAM_CACHE_PREFIX = "flixcasa_stream_cache_v1:";

function streamCacheKey(tmdbId: string | number, mediaType: StreamMediaType, season?: string | number, episode?: string | number) {
  return `${STREAM_CACHE_PREFIX}${mediaType}:${String(tmdbId)}:${season || "-"}:${episode || "-"}`;
}

export function getCachedStreamSources(tmdbId: string | number, mediaType: StreamMediaType = "movie", season?: string | number, episode?: string | number): StreamSource[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(streamCacheKey(tmdbId, mediaType, season, episode));
    if (!raw) return [];
    const cached = JSON.parse(raw) as { expiresAt?: number; sources?: StreamSource[] };
    if (!cached.expiresAt || cached.expiresAt <= Date.now() || !Array.isArray(cached.sources)) return [];
    return cached.sources.filter((source) => isSafeStreamUrl(source.url));
  } catch {
    return [];
  }
}

export function cacheStreamSources(tmdbId: string | number, mediaType: StreamMediaType, sources: StreamSource[], season?: string | number, episode?: string | number) {
  if (typeof window === "undefined" || !sources.length) return;
  try {
    window.localStorage.setItem(streamCacheKey(tmdbId, mediaType, season, episode), JSON.stringify({ expiresAt: Date.now() + STREAM_CACHE_TTL_MS, sources }));
  } catch {
    // Storage is optional on private browsing and constrained WebViews.
  }
}

export function normalizeStreamUrl(value: string | null | undefined): string {
  if (!value) return "";
  let decoded = value.trim();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return /^https?:\/\//i.test(decoded) ? decoded : "";
}

const CHALLENGE_MARKERS = /captcha|cloudflare|checking your browser|verify you are human|access denied|just a moment|attention required/i;

function isDirectMediaCandidate(url: string, contentType: string) {
  return /(?:video\/|audio\/|application\/(?:vnd\.apple\.mpegurl|x-mpegurl|dash\+xml)|application\/octet-stream)/i.test(contentType)
    || /\.(?:mp4|m4v|webm|mkv|m3u8|mpd)(?:[?#]|$)/i.test(url);
}

export async function inspectDirectMediaSource(source: StreamSource, timeoutMs = 1500): Promise<StreamSource | null> {
  const url = normalizeStreamUrl(source.url);
  if (!url || !isSafeStreamUrl(url) || !/\.(?:mp4|m4v|webm|mkv|m3u8|mpd)(?:[?#]|$)/i.test(url)) return null;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers: { Accept: "video/*, audio/*, application/vnd.apple.mpegurl, application/x-mpegURL", Range: "bytes=0-4095" }, signal: controller.signal, cache: "no-store" });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    if (!isDirectMediaCandidate(url, contentType)) return null;
    const sample = await response.clone().body?.getReader().read();
    const bytes = sample?.value ? new TextDecoder().decode(sample.value.slice(0, 4096)) : "";
    if (!sample?.value?.byteLength || CHALLENGE_MARKERS.test(bytes) || /<html[\s>]/i.test(bytes)) return null;
    return { ...source, url, verified: true };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
    controller.abort();
  }
}

export function buildStreamSources(
  tmdbId: string | number,
  mediaType: StreamMediaType = "movie",
  season?: string | number,
  episode?: string | number,
): StreamSource[] {
  const id = String(tmdbId);
  const movieId = encodeURIComponent(id);
  const routeType = mediaType === "tv" ? "tv" : "movie";
  const seasonParam = season ? `?season=${encodeURIComponent(String(season))}${episode ? `&episode=${encodeURIComponent(String(episode))}` : ""}` : "";
  return [
    [`https://vidsrc.pro/embed/${routeType}/${movieId}${seasonParam}`, "Server 1 - Primary HD"],
    [`https://vidsrc.cc/v2/embed/${routeType}/${movieId}${seasonParam}`, "Server 2 - VidSrc CC"],
    [`https://www.2embed.cc/embed/${routeType}/${movieId}${seasonParam}`, "Server 3 - 2Embed Fast"],
    [`https://player.smashy.stream/${routeType}/${movieId}${seasonParam}`, "Server 4 - SmashyStream"],
    [`https://multiembed.mov/directstream.php?video_id=${movieId}&tmdb=1${season ? `&season=${encodeURIComponent(String(season))}` : ""}${episode ? `&episode=${encodeURIComponent(String(episode))}` : ""}`, "Server 5 - SuperEmbed"],
    [`https://vidsrc.me/embed/${routeType}?tmdb=${movieId}`, "Server 6 - VidSrc VIP"],
    [`https://vidsrc.xyz/embed/${routeType}?tmdb=${movieId}`, "Server 7 - VidSrc XYZ"],
    [`https://vidsrc.to/embed/${routeType}/${movieId}${seasonParam}`, "Server 8 - VidSrc TO"],
    [`https://vidsrc.in/embed/${routeType}/${movieId}${seasonParam}`, "Server 9 - VidSrc IN"],
    [`https://vidsrc.pm/embed/${routeType}/${movieId}${seasonParam}`, "Server 10 - VidSrc PM"],
    [`https://vidsrc.net/embed/${routeType}/${movieId}${seasonParam}`, "Server 11 - VidSrc NET"],
    [`https://vidsrc.stream/embed/${routeType}/${movieId}${seasonParam}`, "Server 12 - VidSrc Stream"],
    [`https://embed.su/embed/${routeType}/${movieId}${seasonParam}`, "Server 13 - EmbedSU"],
    [`https://autoembed.co/${routeType}/tmdb/${movieId}${seasonParam}`, "Server 14 - AutoEmbed"],
    [`https://moviekoda.com/embed/${routeType}/${movieId}${seasonParam}`, "Server 15 - MovieKoda"],
    [`https://2embed.org/embed/${routeType}/${movieId}${seasonParam}`, "Server 16 - 2Embed Org"],
    [`https://frembed.live/api/film.php?id=${movieId}`, "Server 17 - FreEmbed"],
    [`https://vidbinge.dev/embed/${routeType}/${movieId}${seasonParam}`, "Server 18 - VidBinge"],
    [`https://moviesapi.club/${routeType}/${movieId}${seasonParam}`, "Server 19 - MoviesAPI"],
    [`https://cinemaos.work/embed/${routeType}/${movieId}${seasonParam}`, "Server 20 - CinemaOS"],
    [`https://vidsrc.vip/embed/${routeType}/${movieId}${seasonParam}`, "Server 21 - VidSrc VIP Mirror"],
    [`https://embed.smashystream.com/playere.php?tmdb=${movieId}`, "Server 22 - SmashyStream Embed"],
    [`https://moviee.tv/embed/${routeType}/${movieId}${seasonParam}`, "Server 23 - Moviee"],
    [`https://play.videasy.net/${routeType}/${movieId}${seasonParam}`, "Server 24 - Videasy"],
    [`https://flixverse.org/embed/${routeType}/${movieId}${seasonParam}`, "Server 25 - Flixverse"],
    [`https://api.123movie.cc/imdb/${movieId}`, "Server 26 - 123Movie"],
    [`https://streamhub.to/embed/${routeType}/${movieId}${seasonParam}`, "Server 27 - StreamHub"],
    [`https://vidsrc.stream/embed/${routeType}?tmdb=${movieId}`, "Server 28 - VidSrc Stream Mirror"],
    [`https://autoembed.cc/embed/${routeType}/${movieId}${seasonParam}`, "Server 29 - AutoEmbed Mirror"],
    [`https://vidsrc.icu/embed/${routeType}/${movieId}${seasonParam}`, "Server 30 - VidSrc ICU"],
  ].map(([url, label]) => ({ url, label, tier: "embed" as const }));
}

export async function prefetchFastestServer(sources: StreamSource[], timeoutMs = 4000): Promise<StreamSource | null> {
  if (!sources.length || typeof window === "undefined") return sources[0] || null;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const winner = await Promise.any(sources.map(async (source) => {
      const direct = await inspectDirectMediaSource(source, Math.min(timeoutMs, 1500));
      if (direct) return direct;
      if (!/\.(?:mp4|m4v|webm|mkv|m3u8|mpd)(?:[?#]|$)/i.test(source.url)) return source;
      throw new Error("Unverified media source");
    }));
    return isSafeStreamUrl(winner.url) ? winner : sources[0] || null;
  } catch {
    return sources[0] || null;
  } finally {
    window.clearTimeout(timeout);
    controller.abort();
  }
}

export async function prefetchStreamSources(tmdbId: string | number, mediaType: StreamMediaType = "movie", season?: string | number, episode?: string | number): Promise<StreamSource[]> {
  const cached = getCachedStreamSources(tmdbId, mediaType, season, episode);
  if (cached.length) return cached;
  const sources = buildStreamSources(tmdbId, mediaType, season, episode);
  const winner = await prefetchFastestServer(sources, 4000);
  const ordered = winner ? [winner, ...sources.filter((source) => source.url !== winner.url)] : sources;
  cacheStreamSources(tmdbId, mediaType, ordered, season, episode);
  return ordered;
}
