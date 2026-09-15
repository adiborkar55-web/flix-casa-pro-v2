import { cacheStreamSources, getCachedStreamSources, type StreamMediaType, type StreamSource } from "@/lib/stream";
import type { CachedStreamRecord, StreamProviderContext } from "./types";

const LOCAL_CACHE_TTL_MS = 30 * 60 * 1000;

function key(context: StreamProviderContext) {
  return `${context.mediaType}:${String(context.tmdbId)}:${context.season || "-"}:${context.episode || "-"}`;
}

export const localCacheProvider = {
  id: "local-cache",
  get(context: StreamProviderContext): StreamSource[] {
    if (context.forceRefresh) return [];
    return getCachedStreamSources(context.tmdbId, context.mediaType, context.season, context.episode);
  },
  set(context: StreamProviderContext, sources: StreamSource[]) {
    cacheStreamSources(context.tmdbId, context.mediaType, sources, context.season, context.episode);
    if (typeof window === "undefined") return;
    try {
      const record: CachedStreamRecord = { expiresAt: Date.now() + LOCAL_CACHE_TTL_MS, sources };
      window.localStorage.setItem(`flixcasa_provider_cache_v1:${key(context)}`, JSON.stringify(record));
    } catch {
      // Local cache is an optimization and must never block playback.
    }
  },
};

export function isSupportedMediaType(value: string): value is StreamMediaType {
  return value === "movie" || value === "tv";
}
