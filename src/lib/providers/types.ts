import type { StreamMediaType, StreamSource } from "@/lib/stream";

export type ExternalStreamPayload =
  | string
  | StreamSource
  | { url?: string; label?: string; quality?: number; hasHindiAudio?: boolean }
  | { sources?: ExternalStreamPayload[] };

export interface StreamProviderContext {
  tmdbId: string | number;
  mediaType: StreamMediaType;
  season?: string | number;
  episode?: string | number;
  forceRefresh?: boolean;
}

export interface StreamProvider {
  readonly id: string;
  canHandle(payload: unknown): boolean;
  resolve(payload: ExternalStreamPayload, context: StreamProviderContext): StreamSource[];
}

export interface CachedStreamRecord {
  expiresAt: number;
  sources: StreamSource[];
}
