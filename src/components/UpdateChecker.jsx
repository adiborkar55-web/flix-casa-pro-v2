"use client";

import { useEffect, useState } from "react";
import supabaseClient from "@/lib/supabaseClient";

const LOCAL_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0";

function compareVersions(left, right) {
  const a = String(left).split(".").map((part) => Number(part) || 0);
  const b = String(right).split(".").map((part) => Number(part) || 0);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if ((a[index] || 0) !== (b[index] || 0)) return (a[index] || 0) - (b[index] || 0);
  }
  return 0;
}

export default function UpdateChecker() {
  const [release, setRelease] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function checkForUpdate() {
      const { data, error } = await supabaseClient
        .from("app_settings")
        .select("current_version, update_url, force_update, update_message")
        .eq("id", "global")
        .maybeSingle();
      if (!error && mounted && data?.current_version && compareVersions(LOCAL_VERSION, data.current_version) < 0) setRelease(data);
    }
    void checkForUpdate();
    const interval = window.setInterval(checkForUpdate, 60_000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  if (!release) return null;
  const required = release.force_update === true;
  const update = () => {
    if (release.update_url) window.location.assign(release.update_url);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 px-6" role="alertdialog" aria-modal="true" aria-labelledby="update-title">
      <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 p-6 text-white shadow-2xl">
        <h2 id="update-title" className="text-xl font-semibold">Update available</h2>
        <p className="mt-3 text-sm text-zinc-300">{release.update_message || `FlixCasa Pro ${release.current_version} is ready to install.`}</p>
        <div className="mt-6 flex justify-end gap-3">
          {!required && <button type="button" onClick={() => setRelease(null)} className="rounded px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">Later</button>}
          <button type="button" onClick={update} disabled={!release.update_url} className="rounded bg-cyan-400 px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50">Update now</button>
        </div>
      </div>
    </div>
  );
}