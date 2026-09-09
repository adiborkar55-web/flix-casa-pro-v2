"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useAuthStore, useSettingsStore } from "@/stores/auth-store";
import { useLibraryStore } from "@/stores/library-store";
import { useProfileStore } from "@/stores/profile-store";
import { buildDefaultPlayerServers } from "@/lib/player-config";
import { useDeviceType } from "@/hooks/use-device-type";

type HealthState = "checking" | "online" | "offline";

export default function SettingsPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const account = useAuthStore((s) => s.account);
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const persist = useSettingsStore((s) => s.persist);
  const clearWatchHistory = useLibraryStore((s) => s.clearWatchHistory);
  const setActiveProfile = useProfileStore((s) => s.setActiveProfile);
  const [safeMode, setSafeMode] = useState(false);
  const [notice, setNotice] = useState("");
  const [serverHealth, setServerHealth] = useState<HealthState[]>([]);
  const { deviceType } = useDeviceType();
  const cameraRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualQrCode, setManualQrCode] = useState("");
  const logout = useAuthStore((s) => s.logout);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    setSafeMode(window.localStorage.getItem("flixcasa:hardware-safe-mode") === "true");
  }, []);

  useEffect(() => {
    if (!isAuthenticated) router.replace("/");
  }, [isAuthenticated, router]);

  useEffect(() => {
    const servers = buildDefaultPlayerServers("0");
    setServerHealth(servers.map(() => "checking"));
    let cancelled = false;
    Promise.all(servers.map(async (server) => {
      try {
        await fetch(server.url, { method: "HEAD", mode: "no-cors", cache: "no-store" });
        return "online" as const;
      } catch {
        return "offline" as const;
      }
    })).then((health) => {
      if (!cancelled) setServerHealth(health);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = async <Key extends keyof typeof settings>(key: Key, value: (typeof settings)[Key]) => {
    updateSettings({ [key]: value });
    if (account) await persist(account.id);
  };

  const toggleHindi = () => {
    void handleChange("audioPriority", settings.audioPriority === "hindi" ? "auto" : "hindi");
  };

  const toggleSafeMode = () => {
    const next = !safeMode;
    setSafeMode(next);
    window.localStorage.setItem("flixcasa:hardware-safe-mode", String(next));
  };

  const toggleSetting = (key: "autoPlayNext" | "autoSelectServer") => {
    void handleChange(key, !settings[key]);
  };

  const clearHistory = async () => {
    if (!account) return;
    await clearWatchHistory(account.id);
    setNotice("Watch history cleared.");
  };

  const clearCache = () => {
    const keys = [] as string[];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.toLowerCase().includes("cache")) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
    setNotice("Cache cleared.");
  };

  const switchProfile = () => {
    setActiveProfile(null);
    router.push("/");
  };

  const stopScanner = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setScannerOpen(false);
  };

  const linkTv = async (value: string) => {
    try {
      const challenge = new URL(value).searchParams.get("tvPair") || value.trim();
      const response = await fetch("/api/auth/qr-session", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: challenge }) });
      setNotice(response.ok ? "TV linked. It will sign in automatically." : "This TV code is invalid or expired.");
      if (response.ok) stopScanner();
    } catch { setNotice("Scan a valid FlixCasa TV QR code."); }
  };

  const startScanner = async () => {
    setScannerOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      cameraStreamRef.current = stream;
      if (cameraRef.current) cameraRef.current.srcObject = stream;
      const Detector = (window as Window & { BarcodeDetector?: new (options?: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>> } }).BarcodeDetector;
      if (!Detector) return;
      const detector = new Detector({ formats: ["qr_code"] });
      const scan = async () => {
        if (!cameraRef.current) return;
        const codes = await detector.detect(cameraRef.current).catch(() => []);
        const value = codes[0]?.rawValue;
        if (value) { await linkTv(value); return; }
        window.setTimeout(() => void scan(), 300);
      };
      void scan();
    } catch { setNotice("Camera access is unavailable. Paste the TV code below."); }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
        <h1 className="mb-2 text-2xl font-bold">Settings</h1>
        <p className="mb-8 text-sm text-zinc-400">Playback and device preferences</p>

        {account && <section className="mb-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"><h2 className="text-sm font-semibold">Account</h2><p className="mt-2 text-sm text-white">{account.name}</p><p className="text-xs text-zinc-400">{account.email}</p><p className="mt-1 text-xs text-green-400">Session active</p><button type="button" onClick={() => setLogoutOpen(true)} className="mt-4 rounded-lg bg-red-800 px-4 py-2 text-sm font-semibold hover:bg-red-700">Log Out</button></section>}

        <div className="space-y-3">
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
            <button type="button" onClick={toggleHindi} className="flex w-full items-center justify-between gap-4 text-left focus:outline-none focus:ring-2 focus:ring-yellow-400">
              <span><strong className="block text-sm">Auto-Select Hindi Audio Priority</strong><small className="text-xs text-zinc-400">Prefer Hindi tracks when available</small></span>
              <span className={`relative h-6 w-11 shrink-0 rounded-full ${settings.audioPriority === "hindi" ? "bg-yellow-400" : "bg-zinc-700"}`} aria-hidden="true"><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${settings.audioPriority === "hindi" ? "translate-x-6" : "translate-x-1"}`} /></span>
            </button>
          </section>

          {deviceType === "mobile" && <section className="rounded-xl border border-cyan-900/60 bg-zinc-900/70 p-4"><h2 className="text-sm font-semibold">Login with TV Device</h2><p className="mt-1 text-xs text-zinc-400">Scan a TV login QR code from this signed-in phone.</p><button type="button" onClick={() => void startScanner()} className="mt-3 rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold hover:bg-cyan-600">Scan QR Code</button>{scannerOpen && <div className="mt-3 space-y-3"><video ref={cameraRef} autoPlay playsInline className="aspect-video w-full rounded bg-black object-cover" /><input value={manualQrCode} onChange={(event) => setManualQrCode(event.target.value)} placeholder="Paste TV code if camera is unavailable" className="w-full rounded bg-zinc-950 px-3 py-2 text-sm text-white" /><div className="flex gap-2"><button type="button" onClick={() => void linkTv(manualQrCode)} className="rounded bg-green-700 px-3 py-2 text-sm">Link TV</button><button type="button" onClick={stopScanner} className="rounded bg-zinc-700 px-3 py-2 text-sm">Cancel</button></div></div>}</section>}

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
            <h2 className="mb-3 text-sm font-semibold">Playback Automation</h2>
            <div className="space-y-3">
              {(["autoPlayNext", "autoSelectServer"] as const).map((key) => {
                const label = key === "autoPlayNext" ? "Auto-Play Next" : "Auto-Select Server";
                return (
                  <button key={key} type="button" onClick={() => toggleSetting(key)} className="flex w-full items-center justify-between gap-4 text-left focus:outline-none focus:ring-2 focus:ring-yellow-400">
                    <span className="text-sm">{label}</span>
                    <span className={`relative h-6 w-11 shrink-0 rounded-full ${settings[key] ? "bg-yellow-400" : "bg-zinc-700"}`} aria-hidden="true"><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${settings[key] ? "translate-x-6" : "translate-x-1"}`} /></span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
            <button type="button" onClick={toggleSafeMode} className="flex w-full items-center justify-between gap-4 text-left focus:outline-none focus:ring-2 focus:ring-yellow-400">
              <span><strong className="block text-sm">Hardware Acceleration Safe Mode</strong><small className="text-xs text-zinc-400">Recommended for Smart TVs and MXQ boxes</small></span>
              <span className={`relative h-6 w-11 shrink-0 rounded-full ${safeMode ? "bg-yellow-400" : "bg-zinc-700"}`} aria-hidden="true"><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${safeMode ? "translate-x-6" : "translate-x-1"}`} /></span>
            </button>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
            <h2 className="mb-3 text-sm font-semibold">Storage</h2>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => void clearHistory()} className="rounded-lg bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-yellow-400">Clear Watch History</button>
              <button type="button" onClick={clearCache} className="rounded-lg bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-yellow-400">Clear Cache</button>
            </div>
            {notice && <p role="status" className="mt-3 text-xs text-green-400">{notice}</p>}
          </section>

          <section>
            <label className="mb-2 block text-sm text-zinc-400">Theme</label>
            <select
              value={settings.theme}
              onChange={(e) => void handleChange("theme", e.target.value as "dark" | "light")}
              className="w-full rounded-lg bg-zinc-800 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Server Health</h2>
              <span className="text-xs text-zinc-500">Live check</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              {buildDefaultPlayerServers("0").map((server, index) => (
                <div key={server.label} className="flex items-center gap-2 rounded bg-zinc-800/70 px-2 py-2">
                  <span className={`h-2 w-2 rounded-full ${serverHealth[index] === "online" ? "bg-green-400" : serverHealth[index] === "offline" ? "bg-red-400" : "bg-yellow-400"}`} />
                  <span className="truncate">{server.label.replace(/^Server \d+ - /, "")}</span>
                </div>
              ))}
            </div>
          </section>

          <p className="pt-4 text-xs text-zinc-500">Flix Casa Pro v2.0 Ultra-Light</p>

          <section>
            <label className="mb-2 block text-sm text-zinc-400">Audio Priority</label>
            <select
              value={settings.audioPriority}
              onChange={(e) => void handleChange("audioPriority", e.target.value as typeof settings.audioPriority)}
              className="w-full rounded-lg bg-zinc-800 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="auto">Auto Detect</option>
              <option value="marathi">Marathi</option>
              <option value="hindi">Hindi</option>
              <option value="english">English</option>
            </select>
          </section>

          <section>
            <label className="mb-2 block text-sm text-zinc-400">Quality Preference</label>
            <select
              value={settings.qualityPreference}
              onChange={(e) => void handleChange("qualityPreference", e.target.value as typeof settings.qualityPreference)}
              className="w-full rounded-lg bg-zinc-800 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="auto">Auto-Adapt</option>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="480p">480p</option>
            </select>
          </section>

          <button
            onClick={switchProfile}
            className="w-full rounded-lg bg-zinc-800 py-3 text-sm hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            Switch Profile
          </button>
        </div>
      </div>
      {logoutOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" role="dialog" aria-modal="true" aria-labelledby="logout-title"><div className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"><h2 id="logout-title" className="text-lg font-semibold">Log out of FlixCasa?</h2><p className="mt-2 text-sm text-zinc-400">You will need to sign in again on this device.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setLogoutOpen(false)} className="rounded bg-zinc-700 px-4 py-2 text-sm">Cancel</button><button type="button" onClick={() => void logout()} className="rounded bg-red-700 px-4 py-2 text-sm font-semibold">Log Out</button></div></div></div>}
    </AppShell>
  );
}
