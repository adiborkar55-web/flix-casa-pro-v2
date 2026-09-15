import { buildStreamSources, normalizeStreamUrl, type StreamSource } from "@/lib/stream";
import { externalUrlProvider } from "./external-url-provider";
import { localCacheProvider } from "./local-cache-provider";
import type { ExternalStreamPayload, StreamProviderContext } from "./types";

export interface ResolveStreamOptions extends StreamProviderContext {
  payload?: ExternalStreamPayload;
}

function uniqueSources(sources: StreamSource[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const url = normalizeStreamUrl(source.url);
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

export function getCachedSources(context: StreamProviderContext) {
  return localCacheProvider.get(context);
}

export function resolveExternalPayload(payload: ExternalStreamPayload, context: StreamProviderContext) {
  if (!externalUrlProvider.canHandle(payload)) return [];
  return externalUrlProvider.resolve(payload, context);
}

export function resolveStreamSources(options: ResolveStreamOptions): StreamSource[] {
  const cached = localCacheProvider.get(options);
  if (cached.length) return cached;

  const payloadSources = options.payload ? resolveExternalPayload(options.payload, options) : [];
  const fallbackSources = buildStreamSources(options.tmdbId, options.mediaType, options.season, options.episode);
  const sources = uniqueSources([...payloadSources, ...fallbackSources]);
  if (sources.length) localCacheProvider.set(options, sources);
  return sources;
}

export function saveResolvedSources(context: StreamProviderContext, sources: StreamSource[]) {
  const ordered = uniqueSources(sources);
  if (ordered.length) localCacheProvider.set(context, ordered);
  return ordered;
}
