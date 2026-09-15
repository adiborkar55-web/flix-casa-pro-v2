import {
  inspectDirectMediaSource,
  isSafeStreamUrl,
  normalizeStreamUrl,
  type StreamSource,
} from "@/lib/stream";

export type DirectMediaPayload =
  | string
  | StreamSource
  | {
      url?: string;
      label?: string;
      quality?: number;
      hasHindiAudio?: boolean;
    };

export interface MediaAdapterContext {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface MediaAdapter {
  readonly id: string;
  accepts(payload: DirectMediaPayload): boolean;
  normalize(payload: DirectMediaPayload): StreamSource | null;
  inspect(source: StreamSource, context?: MediaAdapterContext): Promise<StreamSource | null>;
}

function isObjectPayload(payload: DirectMediaPayload): payload is Exclude<DirectMediaPayload, string> {
  return typeof payload === "object" && payload !== null;
}

export const directMediaAdapter: MediaAdapter = {
  id: "direct-media",
  accepts(payload) {
    return typeof payload === "string" || isObjectPayload(payload);
  },
  normalize(payload) {
    const url = normalizeStreamUrl(typeof payload === "string" ? payload : payload.url);
    if (!url || !isSafeStreamUrl(url)) return null;
    if (!/\.(?:mp4|m4v|webm|mkv|m3u8|mpd)(?:[?#]|$)/i.test(url)) return null;
    return {
      url,
      label: typeof payload === "string" ? "Direct media" : payload.label || "Direct media",
      quality: typeof payload === "string" ? undefined : payload.quality,
      hasHindiAudio: typeof payload === "string" ? undefined : payload.hasHindiAudio,
      verified: false,
    };
  },
  async inspect(source, context = {}) {
    if (context.signal?.aborted) return null;
    return inspectDirectMediaSource(source, context.timeoutMs || 1500);
  },
};

export class MediaAdapterManager {
  private readonly adapters: MediaAdapter[];

  constructor(adapters: MediaAdapter[] = [directMediaAdapter]) {
    this.adapters = adapters;
  }

  normalize(payload: DirectMediaPayload): StreamSource | null {
    for (const adapter of this.adapters) {
      if (!adapter.accepts(payload)) continue;
      const source = adapter.normalize(payload);
      if (source) return source;
    }
    return null;
  }

  async resolve(payloads: DirectMediaPayload[], context: MediaAdapterContext = {}): Promise<StreamSource[]> {
    const candidates = payloads.map((payload) => this.normalize(payload)).filter((source): source is StreamSource => Boolean(source));
    const resolved = await Promise.all(candidates.map(async (source) => {
      for (const adapter of this.adapters) {
        if (!adapter.accepts(source)) continue;
        const inspected = await adapter.inspect(source, context);
        if (inspected?.verified) return inspected;
      }
      return null;
    }));
    return resolved.filter((source): source is StreamSource => Boolean(source));
  }

  async resolveFirst(payloads: DirectMediaPayload[], context: MediaAdapterContext = {}): Promise<StreamSource | null> {
    const sources = await this.resolve(payloads, context);
    return sources[0] || null;
  }
}

export const mediaAdapterManager = new MediaAdapterManager();
