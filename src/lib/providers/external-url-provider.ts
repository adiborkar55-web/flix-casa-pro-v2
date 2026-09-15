import { normalizeStreamUrl, type StreamSource } from "@/lib/stream";
import type { ExternalStreamPayload, StreamProvider, StreamProviderContext } from "./types";

type UrlPayload = {
  url?: string;
  label?: string;
  quality?: number;
  hasHindiAudio?: boolean;
};

function isUrlPayload(payload: ExternalStreamPayload): payload is string | UrlPayload {
  return typeof payload === "string" || Boolean(payload && typeof payload === "object" && "url" in payload);
}

function toSource(payload: ExternalStreamPayload, fallbackLabel: string): StreamSource | null {
  if (typeof payload === "string") {
    const url = normalizeStreamUrl(payload);
    return url ? { url, label: fallbackLabel } : null;
  }

  if (!isUrlPayload(payload)) return null;
  const url = normalizeStreamUrl(payload.url);
  return url ? {
    url,
    label: payload.label || fallbackLabel,
    quality: payload.quality,
    hasHindiAudio: payload.hasHindiAudio,
    tier: "embed",
  } : null;
}

export const externalUrlProvider: StreamProvider = {
  id: "external-url",
  canHandle(payload) {
    return typeof payload === "string" || Boolean(payload && typeof payload === "object" && "url" in payload);
  },
  resolve(payload, context: StreamProviderContext) {
    const source = toSource(payload, `External ${context.mediaType} source`);
    return source ? [source] : [];
  },
};
