import Link from "next/link";

export default function SuspendedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-center text-white">
      <div className="max-w-md rounded-lg bg-zinc-900 p-8">
        <h1 className="mb-4 text-2xl font-bold text-red-400">Account Suspended</h1>
        <p className="mb-6 text-zinc-300">Your account has been suspended. If you believe this is a mistake, contact the administrator.</p>
        <Link href="/" className="rounded bg-yellow-400 px-6 py-2 font-semibold text-black">Return Home</Link>
      </div>
    </div>
  );
}
