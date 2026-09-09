import { NextResponse } from "next/server";
import { getTrendingIndia, getGlobalTop, getByGenre, searchMovies, getKidsContent, GENRE_ROWS } from "@/lib/tmdb";
import { sanitizeSearchQuery } from "@/lib/sanitize";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
export async function GET(request) {
    const ip = getClientIp(request);
    const { allowed } = rateLimit(ip, "tmdb");
    if (!allowed)
        return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const query = searchParams.get("q");
    const genreId = searchParams.get("genreId");
    const kids = searchParams.get("kids");
    try {
        if (query) {
            const results = await searchMovies(sanitizeSearchQuery(query));
            return NextResponse.json({ results });
        }
        if (kids === "true") {
            const results = await getKidsContent();
            return NextResponse.json({ results });
        }
        if (genreId) {
            const results = await getByGenre(Number.parseInt(genreId, 10));
            return NextResponse.json({ results });
        }
        switch (type) {
            case "trending-india":
                return NextResponse.json({ results: await getTrendingIndia() });
            case "global-top":
                return NextResponse.json({ results: await getGlobalTop() });
            case "genres":
                return NextResponse.json({ genres: GENRE_ROWS });
            default:
                return NextResponse.json({
                    trending: await getTrendingIndia(),
                    global: await getGlobalTop(),
                    genres: GENRE_ROWS,
                });
        }
    }
    catch (error) {
        console.error("TMDB API request failed:", error instanceof Error ? error.message : "Unknown error");
        if (query || genreId || kids === "true" || type) {
            return NextResponse.json({ results: [] });
        }
        return NextResponse.json({
            trending: [],
            global: [],
            genres: GENRE_ROWS,
        });
    }
}
