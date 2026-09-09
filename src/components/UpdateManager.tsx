"use client";

import { useState } from "react";
import { Rocket, RotateCcw } from "lucide-react";
import { cloudApi } from "@/lib/cloud-api";

export function UpdateManager({ initialVersion = "" }: { initialVersion?: string }) {
  const [version, setVersion] = useState("2.1.0");
  const [notes, setNotes] = useState("");
  const [currentVersion, setCurrentVersion] = useState(initialVersion);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [confirmAction, setConfirmAction] = useState<"publish" | "rollback" | null>(null);
  const [deploying, setDeploying] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const action = confirmAction === "rollback" ? "rollback" : "force_update";
      const response = await fetch(cloudApi("/api/admin"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, version, notes }) });
      if (!response.ok) throw new Error("Update request failed");
      const data = await response.json();
      setCurrentVersion(data.release?.minRequiredVersion || version);
      setActive(action === "force_update");
      setConfirmAction(null);
      setPrompt(action === "force_update" ? "Force update published to active clients." : "Update cancelled and stable version restored.");
    } catch {
      setPrompt("Could not contact the update service. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const deploy = async () => {
    setDeploying(true);
    try {
      const response = await fetch(cloudApi("/api/admin"), { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "deploy" }) });
      const data = await response.json();
      setPrompt(response.ok ? "Deployment triggered for Web and APK clients." : data.error || "Deployment could not be triggered.");
    } catch {
      setPrompt("Deployment service is unavailable.");
    } finally {
      setDeploying(false);
    }
  };

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><Rocket className="h-5 w-5 text-cyan-300" /> Dynamic App Updates</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-zinc-300">New Version<input value={version} onChange={(event) => setVersion(event.target.value)} className="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" /></label>
        <label className="text-sm text-zinc-300 sm:col-span-2">Update Release Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2 min-h-20 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" /></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setConfirmAction("publish")} disabled={busy} className="rounded bg-yellow-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50">{active ? "Update Your App" : "Publish Force Update"}</button>
        <button type="button" onClick={() => void deploy()} disabled={busy || deploying} className="rounded bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{deploying ? "Deploying..." : "Deploy Updates to Vercel"}</button>
        {active && <button type="button" onClick={() => setConfirmAction("rollback")} disabled={busy} className="flex items-center gap-2 rounded bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><RotateCcw className="h-4 w-4" /> Cancel / Rollback Update</button>}
      </div>
      <p className="mt-4 text-xs text-zinc-500">Active client target: {currentVersion || "not loaded"}</p>
      {prompt && <p role="status" className="mt-2 text-sm text-cyan-300">{prompt}</p>}
      {confirmAction && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"><div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 p-6"><h3 className="text-lg font-semibold">{confirmAction === "publish" ? "Confirm Push Force Update to All Active App Users?" : "Confirm Cancel & Rollback Update?"}</h3><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setConfirmAction(null)} className="rounded bg-zinc-700 px-4 py-2 text-sm">Cancel</button><button type="button" onClick={() => void submit()} disabled={busy} className="rounded bg-red-600 px-4 py-2 text-sm font-semibold disabled:opacity-50">Confirm</button></div></div></div>}
    </section>
  );
}
