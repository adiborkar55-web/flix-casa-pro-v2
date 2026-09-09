"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef } from "react";
import { PosterCard } from "./poster-card";
import { ChevronLeft, ChevronRight } from "lucide-react";
export function PosterRow({ title, items, onSelect }) {
    const rowRef = useRef(null);
    if (!items.length)
        return null;
    const scrollRow = (direction) => {
        if (!rowRef.current)
            return;
        rowRef.current.scrollBy({ left: direction === "left" ? -320 : 320, behavior: "smooth" });
    };
    return (_jsxs("section", { className: "mb-6", children: [_jsxs("div", { className: "mb-3 flex items-center justify-between px-1", children: [_jsx("h2", { className: "text-lg font-semibold text-white md:text-xl", children: title }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => scrollRow("left"), className: "rounded-full border border-zinc-700 bg-zinc-900/80 p-2 text-zinc-200 transition-all duration-200 hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:scale-105", "aria-label": `Scroll ${title} left`, children: _jsx(ChevronLeft, { className: "h-4 w-4" }) }), _jsx("button", { onClick: () => scrollRow("right"), className: "rounded-full border border-zinc-700 bg-zinc-900/80 p-2 text-zinc-200 transition-all duration-200 hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:scale-105", "aria-label": `Scroll ${title} right`, children: _jsx(ChevronRight, { className: "h-4 w-4" }) })] })] }), _jsx("div", { ref: rowRef, className: "flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent", children: items.map((item) => (_jsx("div", { className: "w-[120px] shrink-0 snap-start sm:w-[140px] md:w-[160px]", children: _jsx(PosterCard, { item: item, onClick: onSelect }) }, `${item.mediaType}-${item.id}`))) })] }));
}
