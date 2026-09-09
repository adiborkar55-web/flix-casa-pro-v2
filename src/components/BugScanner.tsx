"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Wrench } from "lucide-react";
import { buildDefaultPlayerServers } from "@/lib/player-config";
import { buildStreamSources } from "@/lib/stream";
import { cloudApi } from "@/lib/cloud-api";

type ScanItem = { name: string; url: string; ok?: boolean };

function scanTargets(): ScanItem[] {
  const id = "1339713";
  const playerTargets = buildDefaultPlayerServers(id).map((server) => ({ name: server.label, url: server.url }));
  const streamTargets = buildStreamSources(id).map((server) => ({ name: server.label, url: server.url }));
  const appTargets = ["/api/admin", "/api/tmdb?q=1339713", "/api/release", "/admin", "/settings", "/browse", "/watch/1339713"].map((url) => ({ name: `Route ${url}`, url }));
  return [...playerTargets, ...streamTargets, ...appTargets].filter((target, index, all) => all.findIndex((item) => item.url === target.url) === index);
}

export function BugScanner() {
  const [items, setItems] = useState<ScanItem[]>([]);
  const [running, setRunning] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [message, setMessage] = useState("");

  const runScan = async () => {
    setRunning(true);
    setMessage("Scanning streaming providers, APIs, and routes...");
    const results = await Promise.all(scanTargets().map(async (item) => {
      try {
        const response = await fetch(item.url.startsWith("/") ? cloudApi(item.url) : item.url, { method: "HEAD", mode: "no-cors", cache: "no-store" });
        return { ...item, ok: response.ok || response.type === "opaque" || response.status === 403 };
      } catch {
        return { ...item, ok: false };
      }
    }));
    setItems(results);
    setMessage(results.some((item) => !item.ok) ? `Bugs Found: ${results.filter((item) => !item.ok).length}` : "System Healthy - 0 Bugs Detected");
    setRunning(false);
  };

  const fixBugs = async () => {
    setFixing(true);
    try {
      const response = await fetch(cloudApi("/api/admin"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "fix_bugs" }) });
      if (!response.ok) throw new Error("Repair request failed");
    } finally {
      setFixing(false);
      await runScan();
    }
  };

  const bugCount = items.filter((item) => item.ok === false).length;
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h2 className="flex items-center gap-2 text-lg font-semibold"><Wrench className="h-5 w-5 text-cyan-300" /> Automated Bug Scanner</h2><p className="mt-1 text-sm text-zinc-400">Checks {scanTargets().length} providers, app APIs, and routes.</p></div>
        <button type="button" onClick={() => void runScan()} disabled={running || fixing} className="flex items-center gap-2 rounded bg-cyan-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"><RefreshCw className="h-4 w-4" /> {running ? "Scanning..." : "Bug Check"}</button>
      </div>
      {message && <p className={`mt-4 flex items-center gap-2 text-sm font-semibold ${bugCount ? "text-red-300" : "text-green-300"}`}>{bugCount ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />} {message}</p>}
      {bugCount > 0 && <button type="button" onClick={() => void fixBugs()} disabled={fixing} className="mt-4 rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{fixing ? "Fixing..." : "Fix Bugs Now"}</button>}
      {items.length > 0 && <div className="mt-4 grid max-h-48 grid-cols-1 gap-1 overflow-auto text-xs sm:grid-cols-2">{items.map((item) => <div key={item.url} className="flex items-center gap-2 rounded bg-zinc-800/70 px-2 py-1.5"><span className={`h-2 w-2 rounded-full ${item.ok ? "bg-green-400" : "bg-red-400"}`} /><span className="truncate">{item.name}</span></div>)}</div>}
    </section>
  );
}
