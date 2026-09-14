export default function WatchHomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <section className="max-w-xl rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-center shadow-2xl">
        <div className="mb-4 text-4xl">🎬</div>
        <h1 className="text-2xl font-bold text-yellow-400">Select a movie or show</h1>
        <p className="mt-3 text-zinc-400">This watch landing page needs a valid media id route.</p>
        <a href="/browse" className="mt-6 inline-flex rounded-full bg-yellow-400 px-5 py-3 font-bold text-black hover:bg-yellow-300">
          Browse Library
        </a>
      </section>
    </main>
  )
}
