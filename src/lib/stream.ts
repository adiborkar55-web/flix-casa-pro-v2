export type StreamMediaType = "movie" | "tv";

export interface StreamSource {
  url: string;
  label: string;
  tier?: "embed";
  hasHindiAudio?: boolean;
  quality?: number;
  seeders?: number;
}

export function normalizeStreamUrl(value: string | null | undefined): string {
  if (!value) return "";
  let decoded = value.trim();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return /^https?:\/\//i.test(decoded) ? decoded : "";
}

export function buildStreamSources(
  tmdbId: string | number,
  mediaType: StreamMediaType = "movie",
  season?: string | number,
  episode?: string | number,
): StreamSource[] {
  const id = String(tmdbId);
  const movieId = encodeURIComponent(id);
  void mediaType;
  void season;
  void episode;
  return [
    [`https://vidsrc.pro/embed/movie/${movieId}`, "Server 1 - Primary HD"],
    [`https://vidsrc.cc/v2/embed/movie/${movieId}`, "Server 2 - VidSrc CC"],
    [`https://www.2embed.cc/embed/${movieId}`, "Server 3 - 2Embed Fast"],
    [`https://player.smashy.stream/movie/${movieId}`, "Server 4 - SmashyStream"],
    [`https://multiembed.mov/directstream.php?video_id=${movieId}&tmdb=1`, "Server 5 - SuperEmbed"],
    [`https://vidsrc.me/embed/movie?tmdb=${movieId}`, "Server 6 - VidSrc VIP"],
    [`https://vidsrc.xyz/embed/movie?tmdb=${movieId}`, "Server 7 - VidSrc XYZ"],
    [`https://vidsrc.to/embed/movie/${movieId}`, "Server 8 - VidSrc TO"],
    [`https://vidsrc.in/embed/movie/${movieId}`, "Server 9 - VidSrc IN"],
    [`https://vidsrc.pm/embed/movie/${movieId}`, "Server 10 - VidSrc PM"],
    [`https://vidsrc.net/embed/movie/${movieId}`, "Server 11 - VidSrc NET"],
    [`https://vidsrc.stream/embed/movie/${movieId}`, "Server 12 - VidSrc Stream"],
    [`https://embed.su/embed/movie/${movieId}`, "Server 13 - EmbedSU"],
    [`https://autoembed.co/movie/tmdb/${movieId}`, "Server 14 - AutoEmbed"],
    [`https://moviekoda.com/embed/movie/${movieId}`, "Server 15 - MovieKoda"],
    [`https://2embed.org/embed/movie/${movieId}`, "Server 16 - 2Embed Org"],
    [`https://frembed.live/api/film.php?id=${movieId}`, "Server 17 - FreEmbed"],
    [`https://vidbinge.dev/embed/movie/${movieId}`, "Server 18 - VidBinge"],
    [`https://moviesapi.club/tv/${movieId}`, "Server 19 - MoviesAPI"],
    [`https://cinemaos.work/embed/movie/${movieId}`, "Server 20 - CinemaOS"],
    [`https://vidsrc.vip/embed/movie/${movieId}`, "Server 21 - VidSrc VIP Mirror"],
    [`https://embed.smashystream.com/playere.php?tmdb=${movieId}`, "Server 22 - SmashyStream Embed"],
    [`https://moviee.tv/embed/movie/${movieId}`, "Server 23 - Moviee"],
    [`https://play.videasy.net/movie/${movieId}`, "Server 24 - Videasy"],
    [`https://flixverse.org/embed/movie/${movieId}`, "Server 25 - Flixverse"],
    [`https://api.123movie.cc/imdb/${movieId}`, "Server 26 - 123Movie"],
    [`https://streamhub.to/embed/movie/${movieId}`, "Server 27 - StreamHub"],
    [`https://vidsrc.stream/embed/movie?tmdb=${movieId}`, "Server 28 - VidSrc Stream Mirror"],
    [`https://autoembed.cc/embed/movie/${movieId}`, "Server 29 - AutoEmbed Mirror"],
    [`https://vidsrc.icu/embed/movie/${movieId}`, "Server 30 - VidSrc ICU"],
  ].map(([url, label]) => ({ url, label, tier: "embed" as const }));
}

export async function prefetchFastestServer(sources: StreamSource[], timeoutMs = 4000): Promise<StreamSource | null> {
  if (!sources.length || typeof window === "undefined") return sources[0] || null;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const winner = await Promise.any(sources.map(async (source) => {
      await fetch(source.url, { method: "HEAD", mode: "no-cors", cache: "no-store", signal: controller.signal });
      return source;
    }));
    return winner;
  } catch {
    return sources[0] || null;
  } finally {
    window.clearTimeout(timeout);
    controller.abort();
  }
}
