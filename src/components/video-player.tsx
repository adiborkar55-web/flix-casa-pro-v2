"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Pause, Play, Settings, X } from "lucide-react";
import Hls from "hls.js";
import { normalizeStreamUrl, type StreamSource } from "@/lib/stream";
import { getPlayerRemoteConfig, resolvePlayerServers, type PlayerRemoteConfig } from "@/lib/player-config";
import type { DeviceType } from "@/hooks/use-device-type";
import { supabase } from "@/lib/supabase";

interface VideoPlayerProps {
  src?: string;
  sources?: StreamSource[];
  title: string;
  tmdbId?: string | number | null;
  poster?: string;
  preferredServerUrl?: string;
  isHindiUnavailable?: boolean;
  onClose?: () => void;
  onProgress?: (progress: number, duration?: number) => void;
  accountId?: string;
  deviceType?: DeviceType;
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function appendResumeParam(url: string, seconds: number) {
  if (!seconds || seconds <= 0) return url;
  const timeParam = `t=${Math.floor(seconds)}`;
  if (url.includes("#")) return `${url}&${timeParam}`;
  return `${url}#${timeParam}`;
}

function cleanTmdbId(value: string | number | null | undefined) {
  if (value == null) return "";
  return String(value).trim().replace(/[^0-9]/g, "");
}

export function VideoPlayer({ src, sources, title, tmdbId, preferredServerUrl, isHindiUnavailable = false, onClose, onProgress, accountId, deviceType = "desktop" }: VideoPlayerProps) {
  const [currentServerIndex, setCurrentServerIndex] = useState(0);
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [statusText, setStatusText] = useState("Probing servers...");
  const [statusBannerVisible, setStatusBannerVisible] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [seekFeedback, setSeekFeedback] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [resumeAt, setResumeAt] = useState(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [englishFallbackNotice, setEnglishFallbackNotice] = useState(false);
  const [hasManualSelection, setHasManualSelection] = useState(false);
  const [remoteConfig, setRemoteConfig] = useState<PlayerRemoteConfig | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const trackingRef = useRef<number | null>(null);
  const manualSelectionRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const tapTimerRef = useRef<number | null>(null);
  const iframeLoadedRef = useRef(false);
  const playerRootRef = useRef<HTMLDivElement | null>(null);
  const currentTimeRef = useRef(0);
  const progressSyncRef = useRef(0);
  const playbackRateRef = useRef(1);
  const qualityRef = useRef("Auto");
  const [playbackRate, setPlaybackRate] = useState(1);
  const [preferredLanguage, setPreferredLanguage] = useState<"Hindi" | "English" | "Auto">("Hindi");
  const [subtitleTrack, setSubtitleTrack] = useState("Off");
  const [quality, setQuality] = useState("Auto");
  const [isScanning, setIsScanning] = useState(true);
  const scanStartedRef = useRef(false);

  const cleanId = cleanTmdbId(tmdbId);
  const storageKey = cleanId ? `flixcasa_resume_${cleanId}` : "";
  const audioHintText = remoteConfig?.audioHint || "Hindi default. Alternate tracks may be available in the player settings.";

  const servers = useMemo(() => {
    const configured = cleanId ? resolvePlayerServers(cleanId, remoteConfig) : [];
    const supplied = sources?.map((source) => ({ label: source.label, url: normalizeStreamUrl(source.url) })).filter((source) => source.url) || [];
    const combined = [...supplied, ...configured];
    if (combined.length) {
      const seen = new Set<string>();
      return combined.filter((server) => {
        if (seen.has(server.url)) return false;
        seen.add(server.url);
        return true;
      });
    }
    const fallbackUrl = normalizeStreamUrl(src);
    return fallbackUrl ? [{ label: "Fallback Source", url: fallbackUrl }] : [];
  }, [cleanId, sources, src, remoteConfig]);

  const directServers = useMemo(
    () => servers.filter((server) => !/legacy\s*embed/i.test(server.label)),
    [servers],
  );
  const legacyServers = useMemo(
    () => servers.filter((server) => /legacy\s*embed/i.test(server.label)),
    [servers],
  );

  const activeSrc = useMemo(() => {
    const normalizedPreferredUrl = normalizeStreamUrl(preferredServerUrl);
    if (normalizedPreferredUrl && !hasManualSelection) return appendResumeParam(normalizedPreferredUrl, resumeAt);
    const server = servers[currentServerIndex];
    if (!server?.url) return "";
    return appendResumeParam(server.url, resumeAt);
  }, [hasManualSelection, preferredServerUrl, servers, currentServerIndex, resumeAt]);
  const isNativeSource = /\.(?:m3u8|mp4|webm)(?:[?#]|$)/i.test(activeSrc);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
  }, []);

  const saveResumeTime = useCallback(
    (seconds: number) => {
      if (!storageKey) return;
      try {
        window.localStorage.setItem(storageKey, String(Math.max(0, Math.floor(seconds))));
      } catch {
        // ignore localStorage errors
      }
    },
    [storageKey],
  );

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const config = await getPlayerRemoteConfig();
        if (isMounted) {
          setRemoteConfig(config);
        }
      } catch {
        if (isMounted) {
          setRemoteConfig(null);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const stored = window.localStorage.getItem(storageKey);
      const seconds = stored ? Number(stored) : 0;
      if (!Number.isNaN(seconds) && seconds > 0) {
        setCurrentTime(seconds);
        setResumeAt(seconds);
        setStatusText(`Resuming at ${formatTime(seconds)}...`);
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  useEffect(() => {
    if (!isPlaying) {
      if (trackingRef.current) {
        window.clearInterval(trackingRef.current);
      }
      return;
    }

    trackingRef.current = window.setInterval(() => {
      setCurrentTime((prev) => {
        const next = Math.max(0, prev + 1);
        if (next % 5 === 0) saveResumeTime(next);
        return next;
      });
    }, 1000);

    return () => {
      if (trackingRef.current) {
        window.clearInterval(trackingRef.current);
      }
    };
  }, [isPlaying, saveResumeTime]);

  useEffect(() => {
    if (!storageKey) return;
    const intervalId = window.setInterval(() => {
      saveResumeTime(currentTime);
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [currentTime, saveResumeTime, storageKey]);

  useEffect(() => {
    if (!englishFallbackNotice) return;
    const timeout = window.setTimeout(() => setEnglishFallbackNotice(false), 3000);
    return () => window.clearTimeout(timeout);
  }, [englishFallbackNotice]);

  useEffect(() => {
    if (isHindiUnavailable) setEnglishFallbackNotice(true);
  }, [isHindiUnavailable]);

  useEffect(() => {
    if (!preferredServerUrl || manualSelectionRef.current) return;
    const preferredIndex = servers.findIndex((server) => server.url === preferredServerUrl);
    if (preferredIndex < 0) return;
    setCurrentServerIndex(preferredIndex);
    setStatusText(`Selected ${servers[preferredIndex].label}`);
  }, [preferredServerUrl, servers]);

  useEffect(() => {
    if (scanStartedRef.current || !servers.length || manualSelectionRef.current) return;
    if (preferredServerUrl) {
      scanStartedRef.current = true;
      setIsScanning(false);
      setStatusText("Playing prefetched server");
      return;
    }
    scanStartedRef.current = true;
    let active = true;
    const controller = new AbortController();
    setStatusText(`Scanning ${servers.length} Fast Hindi Servers... (4s max)`);
    const timeout = window.setTimeout(() => controller.abort(), 4000);
    Promise.any(servers.map((server, index) => fetch(server.url, { method: "HEAD", mode: "no-cors", cache: "no-store", signal: controller.signal }).then(() => index)))
      .then((index) => {
        if (!active || manualSelectionRef.current) return;
        setCurrentServerIndex(index);
        setHasManualSelection(true);
        setStatusText(`Playing ${servers[index]?.label || "fastest server"}`);
      })
      .catch(() => {
        if (active) setStatusText("Loading primary server...");
      })
      .finally(() => {
        if (active) setIsScanning(false);
        window.clearTimeout(timeout);
      });
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [preferredServerUrl, servers]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setStatusBannerVisible(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [activeSrc]);

  useEffect(() => {
    if (!videoRef.current) return;
    if (!isNativeSource) return;
    const video = videoRef.current;
    let hls: Hls | null = null;
    if (/\.m3u8(?:[?#]|$)/i.test(activeSrc) && !video.canPlayType("application/vnd.apple.mpegurl")) {
      if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: true, lowLatencyMode: true });
        hlsRef.current = hls;
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (qualityRef.current === "Auto") {
            hls!.currentLevel = -1;
            return;
          }
          const targetHeight = Number.parseInt(qualityRef.current, 10);
          const closestIndex = hls!.levels.reduce((bestIndex, level, index, levels) => {
            const bestDistance = Math.abs(levels[bestIndex].height - targetHeight);
            return Math.abs(level.height - targetHeight) < bestDistance ? index : bestIndex;
          }, 0);
          hls!.currentLevel = closestIndex;
        });
        hls.loadSource(activeSrc);
        hls.attachMedia(video);
      }
    } else {
      video.src = activeSrc;
    }
    return () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
      hls?.destroy();
      if (hlsRef.current === hls) hlsRef.current = null;
    };
  }, [activeSrc, isNativeSource]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isNativeSource) return;
    video.playbackRate = playbackRate;
  }, [playbackRate, isNativeSource]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isNativeSource) return;
    if (isPlaying) {
      hlsRef.current?.startLoad(-1);
      void video.play().catch(() => setIsPlaying(false));
    } else {
      hlsRef.current?.stopLoad();
      video.pause();
    }
  }, [isPlaying, isNativeSource]);

  useEffect(() => () => {
    if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
    if (trackingRef.current) window.clearInterval(trackingRef.current);
    if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
    hlsRef.current?.destroy();
    hlsRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
  }, []);

  useEffect(() => {
    if (!isNativeSource || !hlsRef.current) return;
    if (quality === "Auto") {
      hlsRef.current.currentLevel = -1;
      return;
    }

    const targetHeight = Number.parseInt(quality, 10);
    let closestIndex = -1;
    let closestDistance = Number.POSITIVE_INFINITY;
    hlsRef.current.levels.forEach((level, index) => {
      const distance = Math.abs(level.height - targetHeight);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    if (closestIndex >= 0) hlsRef.current.currentLevel = closestIndex;
  }, [quality, isNativeSource]);

  useEffect(() => {
    const originalOpen = window.open;
    const originalOnBeforeUnload = window.onbeforeunload;
    const onBlur = () => {
      window.setTimeout(() => {
        if (document.hidden) return;
        window.focus?.();
      }, 100);
    };

    const blockExternalNavigation = (event: MouseEvent | KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor?.href) return;
      const href = anchor.href;
      const isSameOrigin = href.startsWith(window.location.origin) || href.startsWith("/") || href.startsWith("#");
      if (!isSameOrigin && !href.startsWith("mailto:") && !href.startsWith("tel:")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    if (typeof window !== "undefined") {
      window.open = () => null;
      window.onbeforeunload = () => "Are you sure you want to leave this stream?";
    }
    window.addEventListener("blur", onBlur);
    document.addEventListener("click", blockExternalNavigation, true);
    document.addEventListener("keydown", blockExternalNavigation, true);

    return () => {
      window.open = originalOpen;
      window.onbeforeunload = originalOnBeforeUnload;
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("click", blockExternalNavigation, true);
      document.removeEventListener("keydown", blockExternalNavigation, true);
    };
  }, []);

  const handleIframeLoad = () => {
    iframeLoadedRef.current = true;
    setStatusBannerVisible(false);
    setStatusText(`Loaded ${servers[currentServerIndex]?.label || "Server"}; waiting for player...`);
    showControls();
  };

  const autoSwitchServer = useCallback(() => {
    if (currentServerIndex < servers.length - 1) {
      setResumeAt(currentTimeRef.current);
      setHasManualSelection(true);
      setCurrentServerIndex((index) => index + 1);
      setStatusText(`Switching to ${servers[currentServerIndex + 1]?.label || "next server"}...`);
      return;
    }
    setStatusText("All configured servers are unavailable.");
  }, [currentServerIndex, servers]);

  const handleIframeError = () => {
    autoSwitchServer();
  };

  const handleNativeError = () => {
    autoSwitchServer();
  };

  useEffect(() => {
    if (!activeSrc || isNativeSource || preferredServerUrl) return;
    iframeLoadedRef.current = false;
    const timeout = window.setTimeout(() => {
      if (!iframeLoadedRef.current) autoSwitchServer();
    }, 3000);
    return () => window.clearTimeout(timeout);
  }, [activeSrc, autoSwitchServer, isNativeSource, preferredServerUrl]);

  const seekBy = (seconds: number) => {
    if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime + seconds);
    setCurrentTime((current) => Math.max(0, current + seconds));
    setResumeAt((current) => Math.max(0, current + seconds));
    setSeekFeedback(seconds);
    showControls();
  };

  const handleTap = (event: React.MouseEvent<HTMLDivElement>) => {
    if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
    tapTimerRef.current = window.setTimeout(() => {
      const bounds = event.currentTarget.getBoundingClientRect();
      const position = event.clientX - bounds.left;
      if (position > bounds.width * 0.33 && position < bounds.width * 0.67) {
        setIsPlaying((playing) => !playing);
      }
      tapTimerRef.current = null;
    }, 220);
  };

  const handleDoubleTap = (event: React.MouseEvent<HTMLDivElement>) => {
    if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
    const bounds = event.currentTarget.getBoundingClientRect();
    seekBy(event.clientX - bounds.left < bounds.width / 2 ? -10 : 10);
  };

  const handleManualSelect = (index: number) => {
    setIsAutoMode(false);
    setHasManualSelection(true);
    setShowServerMenu(false);
    manualSelectionRef.current = true;
    setResumeAt(currentTime);
    setCurrentServerIndex(index);
    const selectedUrl = servers[index]?.url;
    setStatusText(`Loading Server ${index + 1}...`);
    const value = `${servers[index]?.label || ""} ${selectedUrl || ""}`.toLowerCase();
    if (!/hindi|\bhi\b|[?&](?:ds_)?lang(?:uage)?=hi(?:&|$)/i.test(value)) {
      setEnglishFallbackNotice(true);
    }
    showControls();
  };

  const onContainerInteraction = () => {
    showControls();
    if (deviceType === "mobile") {
      const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
      if (orientation.lock) void orientation.lock("landscape").catch(() => undefined);
    }
  };

  const handlePlayerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const focusable = Array.from(playerRootRef.current?.querySelectorAll<HTMLElement>("button, select, [tabindex]:not([tabindex='-1'])") || []);
    const activeIndex = focusable.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape" || event.key === "Backspace" || event.key === "BrowserBack") {
      event.preventDefault();
      onClose?.();
      return;
    }
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      if (event.target instanceof HTMLSelectElement) {
        showControls();
        return;
      }
      event.preventDefault();
      if (focusable.length) {
        const step = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
        focusable[(activeIndex + step + focusable.length) % focusable.length]?.focus();
      }
      showControls();
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setCurrentTime((prev) => {
          const next = Math.max(0, prev + 10);
          saveResumeTime(next);
          setResumeAt(next);
          return next;
        });
        setSeekFeedback(10);
        showControls();
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setCurrentTime((prev) => {
          const next = Math.max(0, prev - 10);
          saveResumeTime(next);
          setResumeAt(next);
          return next;
        });
        setSeekFeedback(-10);
        showControls();
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setIsPlaying((prev) => !prev);
        showControls();
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setStatusText("Focus up");
        showControls();
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setStatusText("Focus down");
        showControls();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousemove", showControls);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousemove", showControls);
    };
  }, [saveResumeTime, showControls]);

  useEffect(() => {
    if (seekFeedback == null) return;
    const timer = window.setTimeout(() => setSeekFeedback(null), 800);
    return () => window.clearTimeout(timer);
  }, [seekFeedback]);

  return (
    <div ref={playerRootRef} data-device={deviceType} className={`fixed inset-0 z-[60] flex flex-col bg-black ${deviceType === "tv" ? "[& button]:min-h-12 [& button]:min-w-12" : ""}`} style={{ transform: "translateZ(0)" }} onMouseMove={onContainerInteraction} onClick={onContainerInteraction} onKeyDown={handlePlayerKeyDown} tabIndex={-1}>
      {englishFallbackNotice && (
        <div role="status" className="absolute inset-x-0 top-0 z-[10000] bg-yellow-400 px-4 py-3 text-center text-sm font-semibold text-black shadow-lg">
          Hindi audio not available on this server. Playing in default audio.
        </div>
      )}
      <div className={`relative overflow-visible z-[9999] flex items-center justify-between bg-zinc-950/95 px-4 py-3 text-sm text-white transition-opacity duration-200 ${controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`} style={{ transform: "translateZ(0)" }}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-zinc-400">{title}</span>
          <span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-2.5 py-1 text-[11px] uppercase tracking-wide text-zinc-300">{isAutoMode ? "Auto" : "Manual"}</span>
          {statusBannerVisible && <span className="text-xs text-zinc-400">{isScanning ? `Scanning ${servers.length} Fast Hindi Servers... (4s max)` : statusText}</span>}
          <span className="text-[11px] text-zinc-500">Audio: {remoteConfig?.defaultLanguage === "hi" ? "Hindi default" : "Auto"} • {audioHintText}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsPlaying((prev) => !prev);
              showControls();
            }}
            className="rounded border border-zinc-700 bg-zinc-900/80 p-2 text-zinc-200 hover:bg-zinc-800"
            aria-label={isPlaying ? "Pause playback" : "Resume playback"}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <div className="relative">
            <button
              onClick={() => {
                setShowServerMenu((prev) => !prev);
                showControls();
              }}
              className="flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
            >
              Select Server
              <ChevronDown className="h-4 w-4" />
            </button>
            {showServerMenu && (
              <div className="absolute right-0 mt-2 min-w-[180px] rounded border border-zinc-800 bg-zinc-950/95 p-1 shadow-xl z-[9999] overflow-visible">
                {directServers.map((server) => {
                  const index = servers.indexOf(server);
                  return <button
                    key={server.label}
                    onClick={() => handleManualSelect(index)}
                    className={`block w-full rounded px-3 py-2 text-left text-sm transition ${currentServerIndex === index ? "bg-yellow-400 text-black" : "text-zinc-200 hover:bg-zinc-800"}`}
                  >
                    {server.label}
                  </button>;
                })}
                {legacyServers.length > 0 && <div className="border-t border-zinc-800 px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Backup Embeds</div>}
                {legacyServers.map((server) => {
                  const index = servers.indexOf(server);
                  return <button
                    key={server.label}
                    onClick={() => handleManualSelect(index)}
                    className={`block w-full rounded px-3 py-2 text-left text-sm transition ${currentServerIndex === index ? "bg-yellow-400 text-black" : "text-zinc-200 hover:bg-zinc-800"}`}
                  >
                    {server.label}
                  </button>;
                })}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setShowSettingsMenu((visible) => !visible)}
              className="rounded border border-zinc-700 bg-zinc-900/80 p-2 text-zinc-200 hover:bg-zinc-800"
              aria-label="Open playback settings"
            >
              <Settings className="h-4 w-4" />
            </button>
            {showSettingsMenu && (
              <div className="absolute right-0 top-full z-[9999] mt-2 grid min-w-[220px] gap-2 rounded border border-zinc-800 bg-zinc-950 p-3 shadow-xl">
                <label className="text-xs text-zinc-400">Speed<select value={playbackRate} onChange={(event) => { const next = Number(event.target.value); playbackRateRef.current = next; setPlaybackRate(next); }} className="mt-1 w-full rounded bg-zinc-900 px-2 py-1 text-white"><option value="0.5">0.5x</option><option value="1">1.0x</option><option value="1.25">1.25x</option><option value="1.5">1.5x</option><option value="2">2.0x</option></select></label>
                <label className="text-xs text-zinc-400">Audio<select value={preferredLanguage} onChange={(event) => setPreferredLanguage(event.target.value as "Hindi" | "English" | "Auto")} className="mt-1 w-full rounded bg-zinc-900 px-2 py-1 text-white"><option>Hindi</option><option>English</option><option>Auto</option></select></label>
                <label className="text-xs text-zinc-400">Subtitles<select value={subtitleTrack} onChange={(event) => setSubtitleTrack(event.target.value)} className="mt-1 w-full rounded bg-zinc-900 px-2 py-1 text-white"><option>Off</option><option>English</option><option>Hindi</option></select></label>
                <label className="text-xs text-zinc-400">Quality<select value={quality} onChange={(event) => { const next = event.target.value; qualityRef.current = next; setQuality(next); }} className="mt-1 w-full rounded bg-zinc-900 px-2 py-1 text-white"><option>Auto</option><option value="2160">4K</option><option>1080p</option><option>720p</option><option>480p</option><option>128p</option></select></label>
              </div>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded p-2 text-zinc-300 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              aria-label="Close player"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      <div className="z-50 relative w-full h-full min-h-[70vh] block flex items-center justify-center bg-black" onClick={handleTap} onDoubleClick={handleDoubleTap}>
        {!activeSrc && <div className="absolute inset-0 z-40 flex items-center justify-center bg-black" role="status"><div className="h-10 w-10 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" /></div>}
        {activeSrc && isNativeSource && <video
          ref={videoRef}
          key={activeSrc}
          src={activeSrc}
          className="w-full h-full object-contain relative z-30 block opacity-100"
          autoPlay
          playsInline
          controls
          onError={handleNativeError}
          onPlay={() => {
            setIsPlaying(true);
            setStatusBannerVisible(false);
          }}
          onPause={() => setIsPlaying(false)}
          onLoadedMetadata={(event) => {
            if (resumeAt > 0 && event.currentTarget.currentTime < 1) {
              event.currentTarget.currentTime = resumeAt;
              setCurrentTime(resumeAt);
            }
          }}
          onTimeUpdate={(event) => {
            const current = event.currentTarget.currentTime;
            setCurrentTime(current);
            if (current - progressSyncRef.current >= 5) {
              progressSyncRef.current = current;
              onProgress?.(current, event.currentTarget.duration);
              if (accountId && cleanId) {
                void supabase.from("watch_history").upsert({ user_id: accountId, movie_id: Number(cleanId), progress: current, duration: event.currentTarget.duration || 0, updated_at: new Date().toISOString() }, { onConflict: "user_id,movie_id" });
              }
            }
          }}
        />}
        {activeSrc && !isNativeSource && <iframe
          key={currentServerIndex}
          src={activeSrc}
          className="w-full h-full min-h-[75vh] border-0 relative z-30 block bg-black opacity-100"
          allow="autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="no-referrer"
          title={title}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />}
        {seekFeedback !== null && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 flex justify-center text-2xl font-semibold text-white">
            <span className="rounded-full bg-black/70 px-4 py-2">{seekFeedback > 0 ? `+${seekFeedback}s` : `${seekFeedback}s`}</span>
          </div>
        )}
      </div>
    </div>
  );
}
