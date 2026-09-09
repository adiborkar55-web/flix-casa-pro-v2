import React, { useState, useEffect } from "react";

const SERVERS: string[] = [
  "https://vidsrc.pro/embed/movie/",
  "https://vidsrc.cc/v2/embed/movie/",
  "https://www.2embed.cc/embed/",
  "https://player.smashy.stream/movie/",
  "https://multiembed.mov/directstream.php?video_id=",
  "https://vidsrc.me/embed/movie?tmdb=",
  "https://vidsrc.xyz/embed/movie?tmdb=",
  "https://vidsrc.to/embed/movie/",
  "https://vidsrc.in/embed/movie/",
  "https://vidsrc.pm/embed/movie/",
  "https://vidsrc.net/embed/movie/",
  "https://vidsrc.stream/embed/movie/",
  "https://embed.su/embed/movie/",
  "https://autoembed.co/movie/tmdb/",
  "https://moviekoda.com/embed/movie/",
  "https://2embed.org/embed/movie/",
  "https://frembed.live/api/film.php?id=",
  "https://vidbinge.dev/embed/movie/",
  "https://moviesapi.club/tv/",
  "https://cinemaos.work/embed/movie/",
  "https://vidsrc.vip/embed/movie/",
  "https://embed.smashystream.com/playere.php?tmdb=",
  "https://moviee.tv/embed/movie/",
  "https://play.videasy.net/movie/",
  "https://flixverse.org/embed/movie/",
  "https://api.123movie.cc/imdb/",
  "https://streamhub.to/embed/movie/",
  "https://vidsrc.stream/embed/movie?tmdb=",
  "https://autoembed.cc/embed/movie/",
  "https://vidsrc.icu/embed/movie/"
];

interface VideoPlayerProps {
  movieId: string | number;
}

export default function VideoPlayer({ movieId }: VideoPlayerProps) {
  const [workingUrl, setWorkingUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const scanAllServersInParallel = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const checks: Promise<string>[] = SERVERS.map(async (baseUrl) => {
        const target = baseUrl + movieId;
        try {
          await fetch(target, { method: "HEAD", mode: "no-cors", signal: controller.signal });
          return target;
        } catch (error) {
          throw error;
        }
      });

      try {
        const winner = await Promise.any(checks);
        clearTimeout(timeoutId);
        if (isMounted && winner) {
          setWorkingUrl(String(winner));
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          setWorkingUrl(SERVERS[0] + movieId);
          setLoading(false);
        }
      }
    };

    scanAllServersInParallel();
    return () => { isMounted = false; };
  }, [movieId]);

  if (loading) {
    return (
      <div className="w-full h-full min-h-[75vh] bg-black flex flex-col items-center justify-center text-white font-bold text-xl">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mb-4"></div>
        Scanning 30 High-Speed Servers (2-4s max)...
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[75vh] bg-black">
      <iframe
        key={workingUrl}
        src={workingUrl}
        className="w-full h-full min-h-[75vh] border-0 bg-black"
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
