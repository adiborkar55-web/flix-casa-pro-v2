"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { VideoPlayer } from "@/components/video-player";
import { useAuthStore } from "@/stores/auth-store";
import { useLibraryStore } from "@/stores/library-store";
import { useSettingsStore } from "@/stores/auth-store";
import { buildStreamSources, prefetchFastestServer, type StreamSource } from "@/lib/stream";
import { cloudApi } from "@/lib/cloud-api";
import { useDeviceType } from "@/hooks/use-device-type";

function buildBackupEmbedUrl(id: string, mediaType: "movie" | "tv") {
  void mediaType;
  return `https://vidsrc.pro/embed/movie/${encodeURIComponent(id)}`;
}

function normalizeTitle(value: string | null) {
  let decoded = (value || "Movie").replace(/\+/g, " ").trim();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded
    .replace(/%3A|%20|\+/gi, " ")
    .replace(/[<>"'`{}[\]|\\^~]/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Movie";
}

function WatchContent() {
  const { deviceType } = useDeviceType();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const title = normalizeTitle(searchParams.get("title"));
  const mediaType = (searchParams.get("type") || "movie") as "movie" | "tv";
  const season = searchParams.get("season") || undefined;
  const episode = searchParams.get("episode") || undefined;
  const hindiUnavailableFromQuery = searchParams.get("hindiUnavailable") === "1";
  const movieId = parseInt(String(params.id)) || 0;

  const account = useAuthStore((s) => s.account);
  const saveProgress = useLibraryStore((s) => s.saveProgress);
  const qualityPref = useSettingsStore((s) => s.settings.qualityPreference);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [tmdbId, setTmdbId] = useState<string | number | null>(null);
  const [prefetchedUrl, setPrefetchedUrl] = useState<string | null>(null);
  const [poster, setPoster] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(true);
  const [englishTitle, setEnglishTitle] = useState("Movie");
  const mountedRef = useRef(false);

  useEffect(() => {
    const cleanUrl = `${window.location.pathname}?type=${encodeURIComponent(mediaType)}&title=${encodeURIComponent(title)}`;
    window.history.replaceState({}, "", cleanUrl);
  }, [mediaType, title]);

  useEffect(() => {
    mountedRef.current = true;
    async function findStream() {
      setLoading(true);
      setIsScanning(true);
      setError("");
      setStreamUrl(null);
      try {
        const tmdbRes = await fetch(cloudApi(`/api/tmdb?id=${encodeURIComponent(String(params.id))}&type=${encodeURIComponent(mediaType)}`));
        const tmdbData = await tmdbRes.json();
        const match = tmdbData.result;
        if (!mountedRef.current) return;
        if (match?.posterPath) setPoster(match.posterPath);

        const tmdbId = match?.id || params.id;
        const englishTitle = [match?.title, match?.originalTitle, match?.original_title, match?.name]
          .find((value): value is string => typeof value === "string" && /^[\x00-\x7F]+$/.test(value.trim()) && value.trim().length > 0)
          ?.trim() || `Movie ${tmdbId}`;
        setEnglishTitle(englishTitle);
        setTmdbId(tmdbId);
        if (!mountedRef.current) return;
        const fallbackUrl = buildBackupEmbedUrl(String(params.id), mediaType);
        const nextSources = buildStreamSources(tmdbId, mediaType, season, episode);
        const fastestSource = await prefetchFastestServer(nextSources, 4000);
        if (!mountedRef.current) return;
        setSources(nextSources);
        setPrefetchedUrl(fastestSource?.url || null);
        setStreamUrl(fastestSource?.url || fallbackUrl || nextSources[0]?.url || null);
      } catch {
        if (!mountedRef.current) return;
        const fallbackSources = buildStreamSources(String(params.id), mediaType, season, episode);
        const fallbackUrl = fallbackSources[0]?.url || buildBackupEmbedUrl(String(params.id), mediaType);
        setSources(fallbackSources);
        setPrefetchedUrl(fallbackUrl);
        setStreamUrl(fallbackUrl);
        setError("");
      } finally {
        if (mountedRef.current) {
          setIsScanning(false);
          setLoading(false);
        }
      }
    }
    findStream();
    return () => {
      mountedRef.current = false;
    };
  }, [title, qualityPref, mediaType, params.id, season, episode]);

  const handleProgress = (current: number, duration = 0) => {
    if (!account || !movieId) return;
    saveProgress(account.id, {
      movieId,
      mediaType,
      progress: current,
      duration,
      updatedAt: new Date().toISOString(),
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
          <p className="text-zinc-400">{isScanning ? "Scanning 20 Fast Hindi Servers... (4s max)" : "Preparing playback..."}</p>
        </div>
      </div>
    );
  }

  if (!streamUrl) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black p-8">
        <p className="mb-4 text-center text-zinc-300">{error || "No Direct Hindi Stream Found. Click below to try Backup Embeds."}</p>
        <button
          onClick={() => router.back()}
          className="rounded bg-yellow-400 px-6 py-2 font-semibold text-black focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <VideoPlayer
      src={streamUrl || ""}
      sources={sources}
      title={englishTitle}
      tmdbId={tmdbId}
      preferredServerUrl={prefetchedUrl || undefined}
      isHindiUnavailable={hindiUnavailableFromQuery}
      poster={poster}
      onClose={() => router.back()}
      onProgress={handleProgress}
      accountId={account?.id}
      deviceType={deviceType}
    />
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
      </div>
    }>
      <WatchContent />
    </Suspense>
  );
}
