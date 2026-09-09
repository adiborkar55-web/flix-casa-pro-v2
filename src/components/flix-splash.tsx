"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const MINIMUM_DISPLAY_MS = 1700;

export function FlixSplash({ appReady }: { appReady: boolean }) {
  const pathname = usePathname();
  const [catalogReady, setCatalogReady] = useState(pathname !== "/browse");
  const [minimumTimeElapsed, setMinimumTimeElapsed] = useState(false);
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMinimumTimeElapsed(true), MINIMUM_DISPLAY_MS);
    const handleCatalogReady = () => setCatalogReady(true);

    window.addEventListener("flixcasa:catalog-ready", handleCatalogReady);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("flixcasa:catalog-ready", handleCatalogReady);
    };
  }, []);

  useEffect(() => {
    if (pathname !== "/browse") setCatalogReady(true);
  }, [pathname]);

  useEffect(() => {
    if (!appReady || !catalogReady || !minimumTimeElapsed) return;

    setLeaving(true);
    const timer = window.setTimeout(() => setVisible(false), 650);
    return () => window.clearTimeout(timer);
  }, [appReady, catalogReady, minimumTimeElapsed]);

  if (!visible) return null;

  return (
    <div className={`flix-splash ${leaving ? "flix-splash--leaving" : ""}`} role="status" aria-label="Loading Flix Casa Pro">
      <div className="flix-splash__stage" aria-hidden="true">
        <div className="flix-splash__waves flix-splash__waves--left" />
        <div className="flix-splash__waves flix-splash__waves--right" />
        <div className="flix-splash__halo" />
        <div className="flix-splash__logo-wrap">
          <div className="flix-splash__logo flix-splash__logo--back">F</div>
          <div className="flix-splash__logo flix-splash__logo--front">F</div>
          <div className="flix-splash__shine" />
        </div>
      </div>
      <p className="flix-splash__credit">Aaditya B Studios</p>
      <div className="flix-splash__progress" aria-hidden="true"><span /></div>
    </div>
  );
}
