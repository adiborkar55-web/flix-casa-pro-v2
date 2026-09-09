"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
const MINIMUM_DISPLAY_MS = 1700;
export function FlixSplash({ appReady }) {
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
        if (pathname !== "/browse")
            setCatalogReady(true);
    }, [pathname]);
    useEffect(() => {
        if (!appReady || !catalogReady || !minimumTimeElapsed)
            return;
        setLeaving(true);
        const timer = window.setTimeout(() => setVisible(false), 650);
        return () => window.clearTimeout(timer);
    }, [appReady, catalogReady, minimumTimeElapsed]);
    if (!visible)
        return null;
    return (_jsxs("div", { className: `flix-splash ${leaving ? "flix-splash--leaving" : ""}`, role: "status", "aria-label": "Loading Flix Casa Pro", children: [_jsxs("div", { className: "flix-splash__stage", "aria-hidden": "true", children: [_jsx("div", { className: "flix-splash__waves flix-splash__waves--left" }), _jsx("div", { className: "flix-splash__waves flix-splash__waves--right" }), _jsx("div", { className: "flix-splash__halo" }), _jsxs("div", { className: "flix-splash__logo-wrap", children: [_jsx("div", { className: "flix-splash__logo flix-splash__logo--back", children: "F" }), _jsx("div", { className: "flix-splash__logo flix-splash__logo--front", children: "F" }), _jsx("div", { className: "flix-splash__shine" })] })] }), _jsx("p", { className: "flix-splash__credit", children: "Aaditya B Studios" }), _jsx("div", { className: "flix-splash__progress", "aria-hidden": "true", children: _jsx("span", {}) })] }));
}
