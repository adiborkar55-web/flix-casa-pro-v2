"use client";

import { useEffect, useState } from "react";
import type { PlayerServerConfig } from "@/lib/player-config";

const SERVER_TIMEOUT_MS = 1500;
const MAX_CONCURRENT_PROBES = 2;

export interface ValidatedServer extends PlayerServerConfig {
  index: number;
  score: number;
}

interface HindiServerValidation {
  validatedServer: ValidatedServer | null;
  fallbackServer: ValidatedServer | null;
  selectedServerUrl: string | null;
  isHindiUnavailable: boolean;
  isScanning: boolean;
  scanComplete: boolean;
}

function hindiScore(server: PlayerServerConfig): number {
  const value = `${server.label} ${server.url}`.toLowerCase();
  let score = 0;
  if (server.lang?.toLowerCase() === "hi") score += 100;
  if (/[?&](?:ds_)?lang(?:uage)?=hi(?:&|$)/i.test(server.url)) score += 80;
  if (/hindi|\bhi\b/.test(value)) score += 20;
  return score;
}

function probeFrame(url: string, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const frame = document.createElement("iframe");
    const finish = (result: boolean) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", abort);
      window.clearTimeout(timeout);
      frame.remove();
      resolve(result);
    };
    const abort = () => finish(false);
    const timeout = window.setTimeout(() => {
      finish(false);
    }, SERVER_TIMEOUT_MS);
    frame.hidden = true;
    frame.onload = () => {
      finish(true);
    };
    frame.onerror = () => {
      finish(false);
    };
    signal.addEventListener("abort", abort, { once: true });
    frame.src = url;
    document.body.appendChild(frame);
  });
}

async function probeServer(server: PlayerServerConfig, index: number, signal: AbortSignal): Promise<ValidatedServer | null> {
  try {
    const [headOk, frameLoaded] = await Promise.all([
      fetch(server.url, { method: "HEAD", cache: "no-store", signal })
        .then((result) => result.ok)
        .catch(() => false),
      probeFrame(server.url, signal),
    ]);
    if (!headOk && !frameLoaded) return null;
    return { ...server, index, score: hindiScore(server) };
  } catch {
    return null;
  }
}

export function useHindiServerValidator(servers: PlayerServerConfig[]): HindiServerValidation {
  const [validatedServer, setValidatedServer] = useState<ValidatedServer | null>(null);
  const [fallbackServer, setFallbackServer] = useState<ValidatedServer | null>(null);
  const [selectedServerUrl, setSelectedServerUrl] = useState<string | null>(null);
  const [isHindiUnavailable, setIsHindiUnavailable] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);

  useEffect(() => {
    if (!servers.length) {
      setValidatedServer(null);
      setFallbackServer(null);
      setSelectedServerUrl(null);
      setIsHindiUnavailable(false);
      setIsScanning(false);
      setScanComplete(true);
      return;
    }

    let cancelled = false;
    setValidatedServer(null);
    setFallbackServer(null);
    setSelectedServerUrl(null);
    setIsHindiUnavailable(false);
    setIsScanning(true);
    setScanComplete(false);

    const controller = new AbortController();
    const results: Array<ValidatedServer | null> = [];
    let nextIndex = 0;
    const worker = async () => {
      while (!cancelled) {
        const index = nextIndex++;
        if (index >= servers.length) return;
        results[index] = await probeServer(servers[index], index, controller.signal);
      }
    };

    Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT_PROBES, servers.length) }, () => worker())).then(() => {
      if (cancelled) return;
      const hindiServers = results
        .filter((server): server is ValidatedServer => Boolean(server && server.score > 0))
        .sort((left, right) => right.score - left.score || left.index - right.index);
      const healthyServers = results
        .filter((server): server is ValidatedServer => Boolean(server))
        .sort((left, right) => left.index - right.index);
      const bestHindiServer = hindiServers[0] || null;
      const bestFallbackServer = healthyServers.find((server) => server.score === 0) || healthyServers[0] || null;
      setValidatedServer(bestHindiServer);
      setFallbackServer(bestFallbackServer);
      setSelectedServerUrl(bestHindiServer?.url || bestFallbackServer?.url || null);
      setIsHindiUnavailable(hindiServers.length === 0 && healthyServers.length > 0);
      setIsScanning(false);
      setScanComplete(true);
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [servers]);

  return { validatedServer, fallbackServer, selectedServerUrl, isHindiUnavailable, isScanning, scanComplete };
}

export const useSmartStreamValidator = useHindiServerValidator;