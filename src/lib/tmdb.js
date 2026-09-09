const TMDB_BASE = "https://api.themoviedb.org/3";
const POSTER_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const BACKDROP_IMAGE_BASE = "https://image.tmdb.org/t/p/original";
function getApiKey() {
    return process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY || null;
}
async function tmdbFetch(path, params = {}) {
    const key = getApiKey();
    if (!key)
        throw new Error("TMDB API key is not configured");
    const url = new URL(`${TMDB_BASE}${path}`);
    url.searchParams.set("api_key", key);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok)
        throw new Error(`TMDB error: ${res.status}`);
    return res.json();
}
async function fetchPages(path, params = {}, pages = [1, 2, 3]) {
    try {
        const responses = await Promise.all(pages.map((page) => tmdbFetch(path, Object.assign(Object.assign({}, params), { page: String(page) }))));
        const combined = responses.flatMap((data) => data.results || []);
        const unique = new Map();
        for (const item of combined) {
            if (!item.poster_path)
                continue;
            if (!unique.has(item.id))
                unique.set(item.id, item);
        }
        return Array.from(unique.values());
    }
    catch (error) {
        console.error("TMDB list request failed:", error instanceof Error ? error.message : "Unknown error");
        return [];
    }
}
function mapMovie(item, mediaType = "movie") {
    return {
        id: item.id,
        title: item.title || item.name || "Unknown",
        overview: item.overview || "",
        posterPath: item.poster_path ? `${POSTER_IMAGE_BASE}${item.poster_path}` : null,
        backdropPath: item.backdrop_path ? `${BACKDROP_IMAGE_BASE}${item.backdrop_path}` : null,
        releaseDate: item.release_date || item.first_air_date || "",
        voteAverage: item.vote_average,
        genreIds: item.genre_ids || [],
        mediaType: item.media_type || mediaType,
    };
}
export async function getTrendingIndia() {
    const movies = await fetchPages("/trending/movie/week", { region: "IN" }, [1, 2, 3]);
    return movies.map((m) => mapMovie(m));
}
export async function getGlobalTop() {
    const movies = await fetchPages("/movie/popular", { region: "IN" }, [1, 2, 3]);
    return movies.map((m) => mapMovie(m));
}
export async function getByGenre(genreId) {
    const movies = await fetchPages("/discover/movie", {
        with_genres: String(genreId),
        sort_by: "popularity.desc",
        "vote_average.gte": "6",
    }, [1, 2, 3]);
    return movies.map((m) => mapMovie(m));
}
export async function searchMovies(query) {
    const data = await tmdbFetch("/search/multi", { query });
    return data.results
        .filter((r) => r.media_type === "movie" || r.media_type === "tv" || !r.media_type)
        .map((m) => mapMovie(m, m.media_type === "tv" ? "tv" : "movie"));
}
export async function getMovieDetails(id, mediaType = "movie") {
    var _a;
    const data = await tmdbFetch(`/${mediaType}/${id}`);
    return Object.assign(Object.assign({}, mapMovie(data, mediaType)), { genreIds: ((_a = data.genres) === null || _a === void 0 ? void 0 : _a.map((g) => g.id)) || [] });
}
export async function getKidsContent() {
    const data = await tmdbFetch("/discover/movie", {
        certification_country: "US",
        certification: "G",
        with_genres: "16",
        sort_by: "popularity.desc",
    });
    return data.results.map((m) => mapMovie(m));
}
export const GENRE_ROWS = [
    { id: "action", title: "Action", genreId: 28 },
    { id: "adventure", title: "Adventure", genreId: 12 },
    { id: "animation", title: "Animation", genreId: 16 },
    { id: "comedy", title: "Comedy", genreId: 35 },
    { id: "scifi", title: "Sci-Fi", genreId: 878 },
    { id: "horror", title: "Horror", genreId: 27 },
    { id: "romance", title: "Romance", genreId: 10749 },
];
export const KIDS_BLOCKED_GENRES = [27, 53, 80, 10752];
