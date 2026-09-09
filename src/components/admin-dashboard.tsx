"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import { Shield, Ban, Unlock, LogOut, RefreshCw, Bot, CheckCircle2, Play, AlertTriangle } from "lucide-react";
import { buildStreamSources, type StreamSource } from "@/lib/stream";
import { BugScanner } from "@/components/BugScanner";
import { UpdateManager } from "@/components/UpdateManager";
import { NotificationBell } from "@/components/NotificationBell";
import { cloudApi } from "@/lib/cloud-api";

const AISstudio = dynamic(() => import("@/components/AISstudio").then((module) => module.AISstudio), { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-lg border border-zinc-800 bg-zinc-900" /> });

interface AdminAccount {
  id: string;
  email: string;
  name: string;
  isOnline: boolean;
  lastSeen: string;
  isBlocked: boolean;
  isRootAdmin: boolean;
}

interface HealthCheck {
  name: string;
  ok: boolean;
  detail: string;
}

interface SourceControl {
  id: string;
  label: string;
  url: string;
  enabled: boolean;
  priority: number;
}

interface CatalogControl {
  pages: number;
  region: string;
  language: string;
  indianLanguage: string;
}

interface InstanceUser {
  id: string;
  name: string;
  email: string;
  appVersion: string;
  ip?: string;
  userAgent?: string;
  loggedInAt: string;
  lastSeen: string;
  blocked: boolean;
}

export function AdminDashboard() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [testStatus, setTestStatus] = useState<"idle" | "running" | "passed" | "failed">("idle");
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantPreview, setAssistantPreview] = useState("");
  const [releaseVersion, setReleaseVersion] = useState("");
  const [movieQuery, setMovieQuery] = useState("");
  const [movieTitle, setMovieTitle] = useState("");
  const [movieSources, setMovieSources] = useState<StreamSource[]>([]);
  const [manualStreamUrl, setManualStreamUrl] = useState("");
  const [movieNotice, setMovieNotice] = useState("");
  const [sourceControls, setSourceControls] = useState<SourceControl[]>([]);
  const [catalogControl, setCatalogControl] = useState<CatalogControl>({ pages: 5, region: "US", language: "en-US", indianLanguage: "hi-IN" });
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const appInstance = "unified" as const;
  const [instanceUsers, setInstanceUsers] = useState<InstanceUser[]>([]);
  const [instanceState, setInstanceState] = useState<{ logs: string[]; bandwidthMb: number; settings: { streamQuality: string; audioPriority: string } }>({ logs: [], bandwidthMb: 0, settings: { streamQuality: "auto", audioPriority: "auto" } });
  const [lockdown, setLockdown] = useState(false);
  const [securityEvents, setSecurityEvents] = useState<string[]>([]);
  const [rebooting, setRebooting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY?.trim() || "";

  const adminHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    ...(adminKey ? { "x-admin-key": adminKey } : {}),
    "x-app-instance": appInstance,
  }), [adminKey, appInstance]);

  const requestAdmin = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(typeof input === "string" && input.startsWith("/") ? cloudApi(input) : input, { ...init, credentials: "include", headers: { ...adminHeaders(), ...init?.headers } });
        if (response.ok || response.status === 401 || response.status === 403) return response;
        lastError = new Error(`Admin request failed: ${response.status}`);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("Admin request failed");
  }, [adminHeaders]);

  const fetchData = useCallback(async () => {
    try {
      const res = await requestAdmin("/api/admin");
      if (!res.ok) throw new Error("Access denied");
      const data = await res.json();
      const users = (data.instanceState?.users || []) as InstanceUser[];
      setInstanceUsers(users);
      setAccounts(users.map((user) => ({ id: user.id, email: user.email, name: user.name, isOnline: !user.blocked, lastSeen: user.lastSeen, isBlocked: user.blocked, isRootAdmin: false })));
      setInstanceState(data.instanceState || { logs: [], bandwidthMb: 0, settings: { streamQuality: "auto", audioPriority: "auto" } });
      setLockdown(data.security?.lockdown === true);
      setSecurityEvents(data.security?.events || []);
      setReleaseVersion(data.release?.minRequiredVersion || "");
      setSourceControls(data.controls?.sources || []);
      setCatalogControl(data.controls?.catalog || { pages: 5, region: "US", language: "en-US", indianLanguage: "hi-IN" });
      setError("");
    } catch {
      setError("Admin panel accessible only from CasaOS / local server");
    } finally {
      setLoading(false);
    }
  }, [requestAdmin]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const rebootInstance = async () => {
    setRebooting(true);
    try {
      const response = await requestAdmin("/api/admin", { method: "POST", body: JSON.stringify({ action: "secure_reboot", instance: appInstance }) });
      if (!response.ok) throw new Error("Secure reboot failed");
      setLockdown(false);
      setSecurityEvents([]);
      await fetchData();
    } catch {
      setError("Secure reboot failed. Try again.");
    } finally {
      setRebooting(false);
    }
  };

  const toggleInstanceUser = async (user: InstanceUser) => {
    const action = user.blocked ? "unblock_instance_user" : "block_instance_user";
    const response = await requestAdmin("/api/admin", { method: "POST", body: JSON.stringify({ action, userId: user.id, instance: appInstance }) });
    if (response.ok) {
      const data = await response.json();
      setInstanceUsers(data.instanceState?.users || []);
    }
  };

  const saveControls = async (sources: SourceControl[], catalog = catalogControl) => {
    const res = await requestAdmin("/api/admin", { method: "POST", body: JSON.stringify({ action: "update_controls", sources, catalog, settings: instanceState.settings, instance: appInstance }) });
    if (!res.ok) throw new Error("Could not save controls");
    const data = await res.json();
    setSourceControls(data.controls.sources);
    setCatalogControl(data.controls.catalog);
  };

  const toggleSource = async (id: string) => {
    const next = sourceControls.map((source) => source.id === id ? { ...source, enabled: !source.enabled } : source);
    try { await saveControls(next); } catch { setError("Could not update source controls."); }
  };

  const updateSourcePriority = async (id: string, value: string) => {
    const priority = Math.max(1, Math.min(9, Number(value) || 1));
    const next = sourceControls.map((source) => source.id === id ? { ...source, priority } : source);
    try { await saveControls(next); } catch { setError("Could not update source priority."); }
  };

  const updateCatalog = async (field: keyof CatalogControl, value: string) => {
    const next = { ...catalogControl, [field]: field === "pages" ? Math.max(1, Math.min(10, Number(value) || 1)) : value };
    try { await saveControls(sourceControls, next); } catch { setError("Could not update catalog controls."); }
  };

  const addUser = async () => {
    try {
      const res = await requestAdmin("/api/admin", { method: "POST", body: JSON.stringify({ action: "add_account", email: newUserEmail, name: newUserName }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add user");
      const users = (data.instanceState?.users || []) as InstanceUser[];
      setInstanceUsers(users); setAccounts(users.map((user) => ({ id: user.id, email: user.email, name: user.name, isOnline: !user.blocked, lastSeen: user.lastSeen, isBlocked: user.blocked, isRootAdmin: false }))); setNewUserEmail(""); setNewUserName(""); setError("");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not add user"); }
  };

  const runTests = async () => {
    setTestStatus("running");
    try {
      const res = await requestAdmin("/api/admin", { method: "POST", body: JSON.stringify({ action: "health" }) });
      const data = await res.json();
      setChecks(data.checks || []);
      setTestStatus(data.healthy ? "passed" : "failed");
    } catch {
      setTestStatus("failed");
    }
  };

  const askAssistant = async () => {
    if (!assistantPrompt.trim()) return;
    try {
      const res = await requestAdmin("/api/admin", { method: "POST", body: JSON.stringify({ action: "assistant", prompt: assistantPrompt }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Assistant request failed");
      setAssistantPreview(data.preview || data.message || "No preview returned.");
    } catch (requestError) {
      setAssistantPreview(requestError instanceof Error ? requestError.message : "Assistant request failed.");
    }
  };

  const generateMovieLinks = async () => {
    const query = movieQuery.trim();
    if (!query) return;
    setMovieNotice("Looking up title...");
    try {
      const response = await fetch(cloudApi(`/api/tmdb?q=${encodeURIComponent(query)}`));
      if (!response.ok) throw new Error("TMDB lookup failed");
      const data = await response.json();
      const result = data.results?.[0];
      if (!result?.id) throw new Error("No title found");
      const generated = buildStreamSources(result.id, "movie");
      setMovieTitle(result.title || result.name || query);
      setMovieSources(generated);
      setMovieNotice(`Generated ${generated.length} provider links for ${result.title || result.name || query}.`);
    } catch {
      setMovieSources([]);
      setMovieNotice("Could not find that title. Try a TMDB ID or exact movie name.");
    }
  };

  const applyManualStream = () => {
    const url = manualStreamUrl.trim();
    if (!url || !/^https?:\/\//i.test(url)) {
      setMovieNotice("Enter a valid HTTPS HLS, MP4, or embed URL.");
      return;
    }
    setMovieSources((current) => [{ label: "Manual Override", url }, ...current.filter((source) => source.url !== url)]);
    setMovieNotice("Manual stream override added to the provider list.");
  };

  const handleAction = async (accountId: string, action: "block" | "unblock" | "revoke") => {
    try {
      const res = await requestAdmin("/api/admin", {
      method: "POST",
      body: JSON.stringify({ accountId, action }),
    });
    if (res.ok) {
      const data = await res.json();
      setAccounts(data.accounts.map((a: AdminAccount) => ({
        id: a.id,
        email: a.email,
        name: a.name,
        isOnline: a.isOnline,
        lastSeen: a.lastSeen,
        isBlocked: a.isBlocked,
        isRootAdmin: a.isRootAdmin,
      })));
      } else {
        setError("The account action was rejected.");
      }
    } catch {
      setError("Could not reach the live admin API.");
    }
  };

  const handleBlockIp = async (ip: string) => {
    try {
      const res = await requestAdmin("/api/admin", { method: "POST", body: JSON.stringify({ action: "block_ip", ip }) });
      if (res.ok) {
      const data = await res.json();
      setAccounts(data.accounts || []);
      } else setError("Could not block that IP address.");
    } catch { setError("Could not reach the live admin API."); }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-8">
        <div className="max-w-md rounded-lg bg-zinc-900 p-8 text-center">
          <Shield className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h1 className="text-xl font-bold text-red-400">Access Restricted</h1>
          <p className="mt-2 text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-yellow-400">FlixCasa Admin</h1>
            <p className="text-sm text-zinc-400">CasaOS Server Control Panel — Login metadata only, no watch history</p>
          </div>
          <div className="rounded-full border border-green-700 bg-green-950 px-3 py-1.5 text-xs font-semibold text-green-300">Unified Production Mode</div>
          <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-bold">B</span><NotificationBell /><a href="#ai-studio" className="rounded bg-cyan-700 px-3 py-2 text-sm font-semibold hover:bg-cyan-600">🤖 AI Updates</a><button type="button" onClick={() => void fetchData()} className="flex items-center gap-2 rounded bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"><RefreshCw className="h-4 w-4" /> Refresh</button><a href="#updates" className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500">Update App</a></div>
        </header>

        {lockdown && <section className="rounded-lg border border-red-700 bg-black p-5 text-red-200 shadow-[0_0_24px_rgba(220,38,38,0.35)]"><p className="font-semibold">🚨 WARNING: HACK ATTEMPT DETECTED! EMERGENCY LOCKDOWN ACTIVE. ALL MEDIA STREAMS PAUSED.</p><button type="button" onClick={() => void rebootInstance()} disabled={rebooting} className="mt-4 rounded bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">🔄 ONE-CLICK CLEAN &amp; REBOOT</button></section>}

        <section className="grid gap-4 sm:grid-cols-3"><div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"><p className="text-xs text-zinc-500">Active unified users</p><p className="mt-1 text-2xl font-semibold">{instanceUsers.filter((user) => !user.blocked).length}</p></div><div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"><p className="text-xs text-zinc-500">Bandwidth</p><p className="mt-1 text-2xl font-semibold">{instanceState.bandwidthMb} MB</p></div><div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"><p className="text-xs text-zinc-500">Security events</p><p className="mt-1 text-2xl font-semibold">{securityEvents.length}</p></div></section>

        <BugScanner />
        <div id="updates"><UpdateManager initialVersion={releaseVersion} /></div>
        <div id="ai-studio"><AISstudio /></div>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="text-lg font-semibold">System health</h2><p className="mt-1 text-sm text-zinc-400">Run the server-side smoke checks before publishing.</p></div>
              <button onClick={() => void runTests()} disabled={testStatus === "running"} className="flex items-center gap-2 rounded bg-cyan-400 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"><Play className="h-4 w-4" /> Test all</button>
            </div>
            {testStatus === "passed" && <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-green-400"><CheckCircle2 className="h-4 w-4" /> TESTING COMPLETE - ALL GOOD &amp; SYSTEM HEALTHY</p>}
            {testStatus === "failed" && <p className="mt-4 flex items-center gap-2 text-sm text-red-400"><AlertTriangle className="h-4 w-4" /> Checks need attention before publishing.</p>}
            <div className="mt-4 space-y-2">{checks.map((check) => <div key={check.name} className="flex items-center justify-between border-t border-zinc-800 py-2 text-sm"><span>{check.name}</span><span className={check.ok ? "text-green-400" : "text-red-400"}>{check.ok ? "PASS" : check.detail}</span></div>)}</div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-lg font-semibold">Streaming source controls</h2>
            <p className="mt-1 text-sm text-zinc-400">Disable a provider immediately for all clients.</p>
            <div className="mt-4 space-y-2">
              {sourceControls.map((source) => (
                <div key={source.id} className="flex items-center gap-3 rounded bg-zinc-800 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{source.label}</span>
                  <label className="flex items-center gap-1 text-xs text-zinc-400">Priority<select value={source.priority} onChange={(event) => void updateSourcePriority(source.id, event.target.value)} className="rounded bg-zinc-950 px-1.5 py-1 text-white"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option><option value="9">9</option></select></label>
                  <button type="button" onClick={() => void toggleSource(source.id)} className={source.enabled ? "text-green-400" : "text-red-400"}>{source.enabled ? "Enabled" : "Disabled"}</button>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-lg font-semibold">Catalog controls</h2>
            <p className="mt-1 text-sm text-zinc-400">Control TMDB fetch density and regional defaults.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-zinc-400">Pages per category<input type="number" min="1" max="10" value={catalogControl.pages} onChange={(event) => void updateCatalog("pages", event.target.value)} className="mt-1 w-full rounded bg-zinc-950 px-3 py-2 text-white" /></label>
              <label className="text-xs text-zinc-400">Global region<input value={catalogControl.region} onChange={(event) => void updateCatalog("region", event.target.value)} className="mt-1 w-full rounded bg-zinc-950 px-3 py-2 text-white" /></label>
              <label className="text-xs text-zinc-400">Global language<input value={catalogControl.language} onChange={(event) => void updateCatalog("language", event.target.value)} className="mt-1 w-full rounded bg-zinc-950 px-3 py-2 text-white" /></label>
              <label className="text-xs text-zinc-400">Indian language<input value={catalogControl.indianLanguage} onChange={(event) => void updateCatalog("indianLanguage", event.target.value)} className="mt-1 w-full rounded bg-zinc-950 px-3 py-2 text-white" /></label>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Bot className="h-5 w-5 text-yellow-300" /> AI movie adder</h2>
          <p className="mt-1 text-sm text-zinc-400">Enter a TMDB ID or movie name to generate provider links, then add a direct HLS, MP4, or embed override.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <input value={movieQuery} onChange={(event) => setMovieQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void generateMovieLinks(); }} placeholder="TMDB ID or movie name" className="min-w-64 flex-1 rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-yellow-300" />
            <button type="button" onClick={() => void generateMovieLinks()} className="rounded bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300">Generate links</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <input value={manualStreamUrl} onChange={(event) => setManualStreamUrl(event.target.value)} placeholder="https://.../stream.m3u8 or embed URL" className="min-w-64 flex-1 rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-cyan-300" />
            <button type="button" onClick={applyManualStream} className="rounded bg-zinc-700 px-4 py-2 text-sm hover:bg-zinc-600">Add override</button>
          </div>
          {movieTitle && <p className="mt-4 text-sm font-medium text-white">{movieTitle}</p>}
          {movieNotice && <p role="status" className="mt-2 text-xs text-cyan-300">{movieNotice}</p>}
          {movieSources.length > 0 && <div className="mt-3 max-h-40 space-y-1 overflow-auto rounded border border-zinc-800 bg-black p-3 text-xs text-zinc-400">{movieSources.map((source) => <p key={`${source.label}-${source.url}`} className="truncate"><span className="text-zinc-200">{source.label}:</span> {source.url}</p>)}</div>}
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Bot className="h-5 w-5 text-cyan-300" /> AI coding assistant</h2>
          <p className="mt-1 text-sm text-zinc-400">Describe a change to generate a reviewable side-by-side preview. No files are changed unless an approved AI provider is configured.</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2"><textarea value={assistantPrompt} onChange={(event) => setAssistantPrompt(event.target.value)} placeholder="Ask for a UI or feature change..." className="min-h-32 rounded border border-zinc-700 bg-zinc-950 p-3 text-sm text-white outline-none focus:border-cyan-300" /><div className="min-h-32 whitespace-pre-wrap rounded border border-zinc-800 bg-black p-3 font-mono text-xs text-zinc-300">{assistantPreview || "AI preview will appear here."}</div></div>
          <button onClick={() => void askAssistant()} className="mt-3 rounded bg-zinc-700 px-4 py-2 text-sm hover:bg-zinc-600">Generate preview</button>
        </section>

        <section className="rounded-lg bg-zinc-900 p-6">
          <h2 className="mb-4 text-lg font-semibold">Connected Google Accounts</h2>
          <div className="mb-5 flex flex-wrap gap-2">
            <input value={newUserName} onChange={(event) => setNewUserName(event.target.value)} placeholder="Friend name" className="min-w-40 flex-1 rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" />
            <input type="email" value={newUserEmail} onChange={(event) => setNewUserEmail(event.target.value)} placeholder="Google email" className="min-w-56 flex-1 rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" />
            <button type="button" onClick={() => void addUser()} className="rounded bg-green-700 px-4 py-2 text-sm font-semibold hover:bg-green-600">Add access</button>
          </div>
          <div className="space-y-3">
            {accounts.length === 0 && (
              <p className="text-zinc-500">No accounts connected yet.</p>
            )}
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-zinc-800 p-4"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`h-3 w-3 rounded-full ${account.isOnline ? "bg-green-400" : "bg-zinc-600"}`}
                    title={account.isOnline ? "Online" : "Offline"}
                  />
                  <div>
                    <p className="font-medium">
                      {account.name}
                      {account.isRootAdmin && (
                        <span className="ml-2 rounded bg-yellow-400/20 px-2 py-0.5 text-xs text-yellow-400">
                          Root Admin
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-zinc-400">{account.email}</p>
                    <p className="text-xs text-zinc-500">
                      Last seen: {new Date(account.lastSeen).toLocaleString()} ·{" "}
                      {account.isOnline ? "ONLINE" : "OFFLINE"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {account.isRootAdmin ? (
                    <span className="rounded bg-zinc-700 px-3 py-1.5 text-xs text-zinc-400">Protected</span>
                  ) : (
                    <>
                      {account.isBlocked ? (
                        <button
                          onClick={() => handleAction(account.id, "unblock")}
                          className="flex items-center gap-1 rounded bg-green-800 px-3 py-1.5 text-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        >
                          <Unlock className="h-3.5 w-3.5" /> Unblock
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction(account.id, "block")}
                          className="flex items-center gap-1 rounded bg-red-900 px-3 py-1.5 text-sm hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        >
                          <Ban className="h-3.5 w-3.5" /> Block
                        </button>
                      )}
                      <button
                        onClick={() => handleAction(account.id, "revoke")}
                        className="flex items-center gap-1 rounded bg-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      >
                        <LogOut className="h-3.5 w-3.5" /> Revoke Session
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg bg-zinc-900 p-6">
          <h2 className="mb-4 text-lg font-semibold">Unified App Users &amp; Sessions</h2>
          {instanceUsers.length === 0 && <p className="text-zinc-500">No users recorded for this app instance.</p>}
          <div className="space-y-2">
            {instanceUsers.map((user) => (
              <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-zinc-800 p-3">
                <div>
                  <p className="font-medium"><span className={`mr-2 inline-block h-2 w-2 rounded-full ${user.blocked ? "bg-zinc-600" : "bg-green-400"}`} />{user.name} · {user.email}</p>
                  <p className="text-xs text-zinc-400">ID: {user.id} · Version: {user.appVersion} · IP: {user.ip || "unknown"}</p>
                  <p className="text-xs text-zinc-500">Login: {new Date(user.loggedInAt).toLocaleString()} · {user.blocked ? "Blocked" : `Online for ${Math.max(0, Math.floor((now - new Date(user.loggedInAt).getTime()) / 60000))} mins`}</p>
                </div>
                <div className="flex gap-2"><button onClick={() => void toggleInstanceUser(user)} className={`rounded px-3 py-1.5 text-sm ${user.blocked ? "bg-green-800" : "bg-red-800"}`}>{user.blocked ? "Unblock" : "Block"}</button>{user.ip && <button onClick={() => void handleBlockIp(user.ip!)} className="rounded bg-red-950 px-3 py-1.5 text-sm text-red-200">Block IP</button>}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
