type RouteParams = {
  id?: string
}

type QueryParams = {
  type?: string | string[]
  title?: string | string[]
}

function normalizeMediaType(type?: string | string[]) {
  const raw = Array.isArray(type) ? type[0] : type
  const value = (raw || 'movie').toLowerCase()
  return value === 'tv' || value === 'series' || value === 'show' ? 'tv' : 'movie'
}

function normalizeTitle(title?: string | string[]) {
  const raw = Array.isArray(title) ? title[0] : title
  if (!raw || !raw.trim()) return 'Movie'
  try {
    return decodeURIComponent(raw.replace(/\+/g, ' ')).trim()
  } catch {
    return raw.replace(/\+/g, ' ').trim()
  }
}

function buildEmbedUrl(id: string, mediaType: 'movie' | 'tv') {
  const routeType = mediaType === 'tv' ? 'tv' : 'movie'
  return `https://vidsrc.pro/embed/${routeType}/${encodeURIComponent(id)}`
}

export default async function WatchRoutePage({
  params,
  searchParams,
}: {
  params: Promise<RouteParams>
  searchParams?: Promise<QueryParams>
}) {
  const route = await params
  const query = searchParams ? await searchParams : {}
  const id = (route.id || '').trim()

  if (!/^\d+$/.test(id)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <section className="w-full max-w-xl rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-center shadow-2xl">
          <div className="mb-4 text-5xl">🎬</div>
          <h1 className="text-2xl font-black text-yellow-400">Media not found</h1>
          <p className="mt-3 text-zinc-400">The supplied media id is invalid or missing.</p>
          <div className="mt-6 flex justify-center gap-3">
            <a href="/browse" className="rounded-full bg-yellow-400 px-6 py-3 font-black text-black">
              Browse Library
            </a>
            <button type="button" onClick={() => history.back()} className="rounded-full border border-zinc-700 px-6 py-3 font-bold text-zinc-200">
              Go Back
            </button>
          </div>
        </section>
      </main>
    )
  }

  const mediaType = normalizeMediaType(query.type) as 'movie' | 'tv'
  const title = normalizeTitle(query.title)
  const embedUrl = buildEmbedUrl(id, mediaType)

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="flex min-h-screen flex-col">
        <nav className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-yellow-400">Flix Casa</span>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-zinc-400">
              {mediaType}
            </span>
          </div>
          <a className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800" href="/browse">
            Browse
          </a>
        </nav>

        <div className="relative flex-1">
          <iframe
            src={embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-[calc(100vh-80px)] w-full border-0 bg-black"
          />

          <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-zinc-700 bg-black/70 px-4 py-2 text-xs font-semibold text-zinc-200 backdrop-blur">
            {title}
          </div>
        </div>
      </section>
    </main>
  )
}

export async function generateStaticParams() {
  return []
}
