"use client";

import { useRef, useState } from "react";
import type { MovieItem } from "@/types";
import { PosterCard } from "./poster-card";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MAX_POSTERS_PER_ROW = 15;
const VISIBLE_POSTERS = 8;
const POSTER_STEP = 176;

interface PosterRowProps {
  title: string;
  items: MovieItem[];
  onSelect?: (item: MovieItem) => void;
}

export function PosterRow({ title, items, onSelect }: PosterRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [startIndex, setStartIndex] = useState(0);

  if (!items.length) return null;

  const scrollRow = (direction: "left" | "right") => {
    if (!rowRef.current) return;
    const nextIndex = Math.max(0, Math.min(visibleItems.length - VISIBLE_POSTERS, startIndex + (direction === "left" ? -4 : 4)));
    setStartIndex(nextIndex);
    rowRef.current.scrollTo({ left: nextIndex * POSTER_STEP, behavior: "smooth" });
  };

  const visibleItems = items.slice(0, MAX_POSTERS_PER_ROW);
  const windowItems = visibleItems.slice(startIndex, startIndex + VISIBLE_POSTERS);

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-lg font-semibold text-white md:text-xl">{title}</h2>
        <div className="flex gap-2">
          <button onClick={() => scrollRow("left")} className="rounded-full border border-zinc-700 bg-zinc-900/80 p-2 text-zinc-200 transition-all duration-200 hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:scale-105" aria-label={`Scroll ${title} left`}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => scrollRow("right")} className="rounded-full border border-zinc-700 bg-zinc-900/80 p-2 text-zinc-200 transition-all duration-200 hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:scale-105" aria-label={`Scroll ${title} right`}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={rowRef} className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {windowItems.map((item) => (
          <div key={item.id} className="w-[120px] shrink-0 snap-start sm:w-[140px] md:w-[160px]">
            <PosterCard item={item} onClick={onSelect} />
          </div>
        ))}
      </div>
    </section>
  );
}
