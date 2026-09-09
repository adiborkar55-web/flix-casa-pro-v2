"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0";
function compareVersions(left, right) {
    const a = left.split(".").map((part) => Number(part) || 0);
    const b = right.split(".").map((part) => Number(part) || 0);
    for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
        if ((a[index] || 0) !== (b[index] || 0))
            return (a[index] || 0) - (b[index] || 0);
    }
    return 0;
}
export function ForceUpdateGuard({ children }) {
    const pathname = usePathname();
    const [requiredVersion, setRequiredVersion] = useState(APP_VERSION);
    useEffect(() => {
        if (pathname.startsWith("/admin") || pathname.startsWith("/api/"))
            return;
        let active = true;
        const checkVersion = async () => {
            try {
                const response = await fetch("/api/release", { cache: "no-store" });
                if (!response.ok)
                    return;
                const data = (await response.json());
                if (active && data.minRequiredVersion)
                    setRequiredVersion(data.minRequiredVersion);
            }
            catch (_a) {
                // Keep the last known requirement during short network outages.
            }
        };
        void checkVersion();
        const interval = window.setInterval(checkVersion, 30000);
        return () => {
            active = false;
            window.clearInterval(interval);
        };
    }, [pathname]);
    const updateRequired = compareVersions(APP_VERSION, requiredVersion) < 0;
    return (_jsxs(_Fragment, { children: [children, updateRequired && (_jsx("div", { className: "fixed inset-0 z-[200] flex min-h-screen items-center justify-center bg-black px-6 text-center text-white", role: "alertdialog", "aria-modal": "true", "aria-label": "Update required", children: _jsxs("div", { className: "max-w-md", children: [_jsx("div", { className: "mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/10 text-3xl font-black text-cyan-300 shadow-[0_0_35px_rgba(53,239,255,0.35)]", children: "F" }), _jsx("h1", { className: "text-2xl font-bold", children: "Update required" }), _jsx("p", { className: "mt-3 text-zinc-400", children: "This version of Flix Casa Pro is no longer supported. Install the latest version to continue watching." }), _jsxs("p", { className: "mt-5 text-xs uppercase tracking-[0.2em] text-cyan-300", children: ["Required version ", requiredVersion] })] }) }))] }));
}
