"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PosterRow } from "@/components/poster-row";
import { MovieModal } from "@/components/movie-modal";
import { useAuthStore } from "@/stores/auth-store";
import { useProfileStore } from "@/stores/profile-store";
import { useLibraryStore } from "@/stores/library-store";
import { KIDS_BLOCKED_GENRES } from "@/lib/tmdb";
import { Search, Play, Plus, Sparkles } from "lucide-react";
import Image from "next/image";
function BrowseContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tab = searchParams.get("tab");
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const isLoading = useAuthStore((s) => s.isLoading);
    const account = useAuthStore((s) => s.account);
    const activeProfile = useProfileStore((s) => s.activeProfile);
    const myList = useLibraryStore((s) => s.myList);
    const addSearch = useLibraryStore((s) => s.addSearch);
    const [trending, setTrending] = useState([]);
    const [global, setGlobal] = useState([]);
    const [genreRows, setGenreRows] = useState([]);
    const [selected, setSelected] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!isLoading && !isAuthenticated)
            router.replace("/");
        if (!isLoading && isAuthenticated && !activeProfile)
            router.replace("/");
    }, [isLoading, isAuthenticated, activeProfile, router]);
    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const res = await fetch("/api/tmdb");
                const data = await res.json();
                const filterKids = (items) => (activeProfile === null || activeProfile === void 0 ? void 0 : activeProfile.isKids)
                    ? items.filter((m) => !m.genreIds.some((g) => KIDS_BLOCKED_GENRES.includes(g)))
                    : items;
                setTrending(filterKids(data.trending || []));
                setGlobal(filterKids(data.global || []));
                const genres = data.genres || [];
                const rows = await Promise.all(genres.map(async (g) => {
                    const r = await fetch(`/api/tmdb?genreId=${g.genreId}`);
                    const d = await r.json();
                    return { title: g.title, items: filterKids(d.results || []) };
                }));
                setGenreRows(rows);
            }
            catch (_a) {
                /* offline fallback */
            }
            finally {
                setLoading(false);
                window.dispatchEvent(new Event("flixcasa:catalog-ready"));
            }
        }
        if (activeProfile)
            load();
    }, [activeProfile]);
    const featured = useMemo(() => trending[0] || global[0] || null, [trending, global]);
    const filteredRows = useMemo(() => {
        // Build rows based on active tab and ensure no duplicate movie IDs across rows
        const used = new Set();
        const takeUnique = (items, limit = 12) => {
            const out = [];
            for (const it of items) {
                if (used.has(it.id))
                    continue;
                if ((it.voteAverage || 0) < 6.5)
                    continue; // enforce quality threshold
                out.push(it);
                used.add(it.id);
                if (out.length >= limit)
                    break;
            }
            return out;
        };
        if (tab === "movies") {
            return [{ title: "Popular Movies", items: takeUnique(global, 24) }];
        }
        if (tab === "tv") {
            return [{ title: "Top TV Series", items: takeUnique(trending, 24) }];
        }
        if (tab === "kids") {
            const kidsItems = trending.filter((item) => !item.genreIds.some((g) => KIDS_BLOCKED_GENRES.includes(g)));
            return [{ title: "Kids Zone", items: takeUnique(kidsItems, 24) }];
        }
        // Featured movie should be excluded from other rows
        if (featured)
            used.add(featured.id);
        const rows = [];
        rows.push({ title: "Continue Watching", items: takeUnique(myList.slice(0, 8), 8) });
        rows.push({ title: "Trending in India", items: takeUnique(trending, 12) });
        rows.push({ title: "Popular Movies", items: takeUnique(global, 12) });
        rows.push({ title: "Top TV Series", items: takeUnique(trending.slice(0, 20), 12) });
        // Append genre-specific rows from fetched genreRows (already requested in same order as GENRE_ROWS)
        for (const gRow of genreRows) {
            const items = takeUnique(gRow.items || [], 12);
            if (items.length > 0)
                rows.push({ title: gRow.title, items });
        }
        return rows;
    }, [tab, trending, global, myList, genreRows, featured]);
    const handleSearch = async (q) => {
        setSearchQuery(q);
        if (!q.trim()) {
            setSearchResults([]);
            return;
        }
        if (account)
            await addSearch(account.id, q);
        const res = await fetch(`/api/tmdb?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        const filterKids = (activeProfile === null || activeProfile === void 0 ? void 0 : activeProfile.isKids)
            ? (data.results || []).filter((m) => !m.genreIds.some((g) => KIDS_BLOCKED_GENRES.includes(g)))
            : data.results || [];
        setSearchResults(filterKids);
    };
    if (isLoading || !activeProfile) {
        return (_jsx("div", { className: "flex min-h-screen items-center justify-center", children: _jsx("div", { className: "h-10 w-10 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" }) }));
    }
    if (tab === "library") {
        return (_jsx(AppShell, { children: _jsxs("div", { className: "px-3 py-4 md:px-6", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsx("h1", { className: "text-2xl font-bold", children: "My List" }), _jsxs("span", { className: "text-sm text-zinc-400", children: [myList.length, " saved"] })] }), myList.length === 0 ? (_jsx("p", { className: "text-zinc-400", children: "Your list is empty. Add movies with the + button on any poster." })) : (_jsx(PosterRow, { title: "Saved for Later", items: myList, onSelect: setSelected })), _jsx(MovieModal, { item: selected, onClose: () => setSelected(null) })] }) }));
    }
    return (_jsx(AppShell, { children: _jsxs("div", { className: "px-3 py-3 md:px-6 md:py-6", children: [_jsxs("div", { className: "relative mb-6 max-w-xl", children: [_jsx(Search, { className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" }), _jsx("input", { type: "text", placeholder: "Search movies & shows...", value: searchQuery, onChange: (e) => handleSearch(e.target.value), className: "w-full rounded-full border border-zinc-700 bg-zinc-800/90 py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-4 focus:ring-yellow-400" })] }), loading ? (_jsx("div", { className: "flex justify-center py-20", children: _jsx("div", { className: "h-10 w-10 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" }) })) : searchQuery ? (_jsx(PosterRow, { title: `Results for "${searchQuery}"`, items: searchResults, onSelect: setSelected })) : (_jsxs(_Fragment, { children: [featured && (_jsxs("section", { className: "relative mb-8 overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-2xl", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" }), featured.posterPath ? (_jsx(Image, { src: featured.posterPath, alt: featured.title, fill: true, className: "object-cover", unoptimized: true })) : null, _jsxs("div", { className: "relative flex min-h-[320px] flex-col justify-end p-5 sm:p-8 md:min-h-[420px] md:p-10", children: [_jsxs("div", { className: "mb-3 flex w-fit items-center gap-2 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-yellow-300", children: [_jsx(Sparkles, { className: "h-3.5 w-3.5" }), " Featured"] }), _jsx("h1", { className: "max-w-2xl text-3xl font-bold text-white sm:text-4xl", children: featured.title }), _jsx("p", { className: "mt-2 max-w-xl text-sm text-zinc-200 sm:text-base", children: featured.description || "Discover a cinematic experience with premium entertainment for every mood." }), _jsxs("div", { className: "mt-4 flex flex-wrap gap-3", children: [_jsxs("button", { className: "flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2.5 font-semibold text-black transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-yellow-400", children: [_jsx(Play, { className: "h-4 w-4" }), " Watch Now"] }), _jsxs("button", { className: "flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/70 px-4 py-2.5 font-semibold text-white transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-yellow-400", children: [_jsx(Plus, { className: "h-4 w-4" }), " Add to Watchlist"] })] })] })] })), filteredRows.map((row) => (_jsx(PosterRow, { title: row.title, items: row.items, onSelect: setSelected }, row.title)))] })), _jsx(MovieModal, { item: selected, onClose: () => setSelected(null) })] }) }));
}
export default function BrowsePage() {
    return (_jsx(Suspense, { fallback: _jsx("div", { className: "flex min-h-screen items-center justify-center bg-zinc-950", children: _jsx("div", { className: "h-10 w-10 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" }) }), children: _jsx(BrowseContent, {}) }));
}
