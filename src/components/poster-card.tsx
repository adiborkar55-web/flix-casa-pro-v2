"use client";

import type { MovieItem } from "@/types";
import Image from "next/image";

interface PosterCardProps {
  item: MovieItem;
  onClick?: (item: MovieItem) => void;
}

export function PosterCard({ item, onClick }: PosterCardProps) {
  return (
    <button
      onClick={() => onClick?.(item)}
      className="group relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-yellow-400/20 focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:scale-105"
      aria-label={`Watch ${item.title}`}
    >
      {item.posterPath ? (
        <Image
          src={item.posterPath}
          alt={item.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105 group-focus:scale-105"
          sizes="(max-width: 640px) 40vw, (max-width: 1024px) 22vw, 14vw"
          unoptimized
        />
      ) : (
        <div className="flex h-full items-center justify-center p-2 text-center text-xs text-zinc-500">
          {item.title}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute bottom-2 left-2 right-2 text-left">
        <p className="line-clamp-2 text-sm font-semibold text-white">{item.title}</p>
      </div>
    </button>
  );
}
