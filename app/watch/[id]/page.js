"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { VideoPlayer } from "@/components/video-player";
import { buildStreamSources } from "@/lib/stream";
function WatchContent() {
    var _a, _b;
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
    const isValidId = /^\d+$/.test(rawId || "") && Number(rawId) > 0;
    const mediaType = searchParams.get("type") === "tv" ? "tv" : "movie";
    const title = ((_a = searchParams.get("title")) === null || _a === void 0 ? void 0 : _a.trim()) || "Untitled";
    const season = searchParams.get("season") || undefined;
    const episode = searchParams.get("episode") || undefined;
    if (!isValidId) {
        return (_jsxs("div", { className: "flex min-h-screen flex-col items-center justify-center gap-4 bg-black p-8 text-center", children: [_jsx("h1", { className: "text-xl font-semibold text-white", children: "Media not found" }), _jsx("p", { className: "text-zinc-400", children: "The supplied media ID is invalid." }), _jsx("button", { type: "button", onClick: () => router.back(), className: "rounded bg-yellow-400 px-5 py-2 font-semibold text-black hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400", children: "Go back" })] }));
    }
    const sources = buildStreamSources(rawId, mediaType, season, episode);
    return (_jsx(VideoPlayer, { src: (_b = sources[0]) === null || _b === void 0 ? void 0 : _b.url, sources: sources, title: title, tmdbId: rawId, onClose: () => router.back() }));
}
export default function WatchPage() {
    return (_jsx(Suspense, { fallback: _jsx("div", { className: "flex min-h-screen items-center justify-center bg-black", children: _jsx("div", { className: "h-10 w-10 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" }) }), children: _jsx(WatchContent, {}) }));
}
