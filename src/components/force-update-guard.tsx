"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cloudApi } from "@/lib/cloud-api";
import { supabase } from "@/lib/supabase";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0";

function compareVersions(left: string, right: string) {
  const a = left.split(".").map((part) => Number(part) || 0);
  const b = right.split(".").map((part) => Number(part) || 0);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if ((a[index] || 0) !== (b[index] || 0)) return (a[index] || 0) - (b[index] || 0);
  }
  return 0;
}

export function ForceUpdateGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [requiredVersion, setRequiredVersion] = useState(APP_VERSION);
  const [forceUpdate, setForceUpdate] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/")) return;

    let active = true;
    const checkVersion = async () => {
      try {
        const { data: config, error } = await supabase.from("app_config").select("version, min_version, force_update").eq("id", "global").maybeSingle();
        let data: { minRequiredVersion?: string; forceUpdate?: boolean } = {
          minRequiredVersion: config?.min_version || config?.version,
          forceUpdate: config?.force_update === true,
        };
        if (error || !config) {
          const response = await fetch(cloudApi("/api/release"), { cache: "no-store" });
          if (!response.ok) return;
          data = (await response.json()) as { minRequiredVersion?: string; forceUpdate?: boolean };
        }
        if (active) {
          if (data.minRequiredVersion) setRequiredVersion(data.minRequiredVersion);
          setForceUpdate(data.forceUpdate === true);
        }
      } catch {
        // Keep the last known requirement during short network outages.
      }
    };

    void checkVersion();
    const interval = window.setInterval(checkVersion, 30_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [pathname]);

  const updateRequired = forceUpdate || compareVersions(APP_VERSION, requiredVersion) < 0;

  return (
    <>
      {children}
      {updateRequired && (
        <div className="fixed inset-0 z-[200] flex min-h-screen items-center justify-center bg-black px-6 text-center text-white" role="alertdialog" aria-modal="true" aria-label="Update required">
          <div className="max-w-md">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/10 text-3xl font-black text-cyan-300 shadow-[0_0_35px_rgba(53,239,255,0.35)]">F</div>
            <h1 className="text-2xl font-bold">Update required</h1>
            <p className="mt-3 text-zinc-400">This version of Flix Casa Pro is no longer supported. Install the latest version to continue watching.</p>
            <p className="mt-5 text-xs uppercase tracking-[0.2em] text-cyan-300">Required version {requiredVersion}</p>
          </div>
        </div>
      )}
    </>
  );
}
