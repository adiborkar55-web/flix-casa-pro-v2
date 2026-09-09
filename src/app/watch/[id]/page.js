"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { VideoPlayer } from "@/components/video-player";
import { useAuthStore } from "@/stores/auth-store";
import { useLibraryStore } from "@/stores/library-store";
import { useSettingsStore } from "@/stores/auth-store";
import { buildStreamSources } from "@/lib/stream";
function WatchContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const params = useParams();
    const title = searchParams.get("title") || "Movie";
    const mediaType = (searchParams.get("type") || "movie");
    const season = searchParams.get("season") || undefined;
    const episode = searchParams.get("episode") || undefined;
    const movieId = parseInt(String(params.id)) || 0;
    const account = useAuthStore((s) => s.account);
    const saveProgress = useLibraryStore((s) => s.saveProgress);
    const qualityPref = useSettingsStore((s) => s.settings.qualityPreference);
    const [streamUrl, setStreamUrl] = useState(null);
    const [sources, setSources] = useState([]);
    const [tmdbId, setTmdbId] = useState(null);
    const [poster, setPoster] = useState();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        async function findStream() {
            var _a, _b;
            setLoading(true);
            setError("");
            try {
                const tmdbRes = await fetch(`/api/tmdb?q=${encodeURIComponent(title)}`);
                const tmdbData = await tmdbRes.json();
                const match = (_a = tmdbData.results) === null || _a === void 0 ? void 0 : _a[0];
                if (match === null || match === void 0 ? void 0 : match.posterPath)
                    setPoster(match.posterPath);
                const tmdbId = (match === null || match === void 0 ? void 0 : match.id) || params.id;
                setTmdbId(tmdbId);
                const nextSources = buildStreamSources(tmdbId, mediaType, season, episode);
                const fallbackUrl = ((_b = nextSources[0]) === null || _b === void 0 ? void 0 : _b.url) || null;
                if (!fallbackUrl)
                    throw new Error("No stream source available");
                setSources(nextSources);
                setStreamUrl(fallbackUrl);
            }
            catch (_c) {
                setError("Unable to find a stream. All providers were tried with automatic fallback.");
            }
            finally {
                setLoading(false);
            }
        }
        findStream();
    }, [title, qualityPref, mediaType, params.id, season, episode]);
    const handleProgress = (current, duration = 0) => {
        if (!account || !movieId)
            return;
        saveProgress(account.id, {
            movieId,
            mediaType,
            progress: current,
            duration,
            updatedAt: new Date().toISOString(),
        });
    };
    if (loading) {
        return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-black", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" }), _jsx("p", { className: "text-zinc-400", children: "Finding best stream across all providers..." })] }) }));
    }
    if (error || !streamUrl) {
        return (_jsxs("div", { className: "flex min-h-screen flex-col items-center justify-center bg-black p-8", children: [_jsx("p", { className: "mb-4 text-red-400", children: error || "Stream unavailable" }), _jsx("button", { onClick: () => router.back(), className: "rounded bg-yellow-400 px-6 py-2 font-semibold text-black focus:outline-none focus:ring-2 focus:ring-yellow-400", children: "Go Back" })] }));
    }
    return (_jsx(VideoPlayer, { src: streamUrl || "", sources: sources, title: title, tmdbId: tmdbId, poster: poster, onClose: () => router.back(), onProgress: handleProgress }));
}
export default function WatchPage() {
    return (_jsx(Suspense, { fallback: _jsx("div", { className: "flex min-h-screen items-center justify-center bg-black", children: _jsx("div", { className: "h-12 w-12 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" }) }), children: _jsx(WatchContent, {}) }));
}
