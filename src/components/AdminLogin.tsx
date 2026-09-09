"use client";

import { FormEvent, useEffect, useState } from "react";
import { cloudApi } from "@/lib/cloud-api";

const SESSION_KEY = "flixcasa-admin-session";

export function AdminLogin({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const response = await fetch(cloudApi("/api/admin"), { credentials: "include" });
        setAuthenticated(response.ok && window.localStorage.getItem(SESSION_KEY) === "authenticated");
      } catch {
        setAuthenticated(false);
      } finally {
        setChecking(false);
      }
    };
    void verifySession();
  }, []);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(cloudApi("/api/admin/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error("Invalid admin credentials.");
      window.localStorage.setItem(SESSION_KEY, "authenticated");
      setAuthenticated(true);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) return null;
  if (authenticated) return <>{children}</>;

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
      <form onSubmit={login} className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Flix Casa Pro</p>
        <h1 className="text-3xl font-bold">Admin Portal</h1>
        <p className="mt-2 text-sm text-zinc-400">Sign in with the configured administrator credentials.</p>
        <label className="mt-8 block text-sm text-zinc-300">Admin Google Email
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-cyan-300" />
        </label>
        <label className="mt-4 block text-sm text-zinc-300">Password
          <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-cyan-300" />
        </label>
        {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
        <button disabled={submitting} className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
          {submitting ? "Checking credentials..." : "Login to Admin Portal"}
        </button>
      </form>
    </main>
  );
}
