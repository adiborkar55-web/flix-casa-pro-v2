"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from "react";
import { Shield, Ban, Unlock, LogOut, RefreshCw, Bot, CheckCircle2, Rocket, Play, AlertTriangle } from "lucide-react";
export function AdminDashboard() {
    const [accounts, setAccounts] = useState([]);
    const [downloader, setDownloader] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [checks, setChecks] = useState([]);
    const [testStatus, setTestStatus] = useState("idle");
    const [assistantPrompt, setAssistantPrompt] = useState("");
    const [assistantPreview, setAssistantPreview] = useState("");
    const [releaseVersion, setReleaseVersion] = useState("");
    const fetchData = useCallback(async () => {
        var _a;
        try {
            const res = await fetch("/api/admin");
            if (!res.ok)
                throw new Error("Access denied");
            const data = await res.json();
            setAccounts(data.accounts);
            setDownloader(data.downloader || null);
            setSessions(data.sessions || []);
            setReleaseVersion(((_a = data.release) === null || _a === void 0 ? void 0 : _a.minRequiredVersion) || "");
            setError("");
        }
        catch (_b) {
            setError("Admin panel accessible only from CasaOS / local server");
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [fetchData]);
    const runTests = async () => {
        setTestStatus("running");
        try {
            const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "health" }) });
            const data = await res.json();
            setChecks(data.checks || []);
            setTestStatus(data.healthy ? "passed" : "failed");
        }
        catch (_a) {
            setTestStatus("failed");
        }
    };
    const askAssistant = async () => {
        if (!assistantPrompt.trim())
            return;
        const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "assistant", prompt: assistantPrompt }) });
        const data = await res.json();
        setAssistantPreview(data.preview || data.message || "No preview returned.");
    };
    const publishUpdate = async () => {
        var _a;
        if (testStatus !== "passed")
            return;
        const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "publish", notes: "Published from Admin Desktop" }) });
        if (res.ok) {
            const data = await res.json();
            setReleaseVersion(((_a = data.release) === null || _a === void 0 ? void 0 : _a.minRequiredVersion) || releaseVersion);
        }
    };
    const handleAction = async (accountId, action) => {
        const res = await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accountId, action }),
        });
        if (res.ok) {
            const data = await res.json();
            setAccounts(data.accounts.map((a) => ({
                id: a.id,
                email: a.email,
                name: a.name,
                isOnline: a.isOnline,
                lastSeen: a.lastSeen,
                isBlocked: a.isBlocked,
                isRootAdmin: a.isRootAdmin,
            })));
            setSessions(data.sessions || []);
        }
    };
    const handleRevokeSession = async (sessionToken) => {
        const res = await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "revoke_session", sessionToken }),
        });
        if (res.ok) {
            const data = await res.json();
            setSessions(data.sessions || []);
            setAccounts(data.accounts || []);
        }
    };
    if (loading) {
        return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-zinc-950", children: _jsx("div", { className: "h-10 w-10 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" }) }));
    }
    if (error) {
        return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-zinc-950 p-8", children: _jsxs("div", { className: "max-w-md rounded-lg bg-zinc-900 p-8 text-center", children: [_jsx(Shield, { className: "mx-auto mb-4 h-12 w-12 text-red-400" }), _jsx("h1", { className: "text-xl font-bold text-red-400", children: "Access Restricted" }), _jsx("p", { className: "mt-2 text-zinc-400", children: error })] }) }));
    }
    return (_jsx("div", { className: "min-h-screen bg-zinc-950 p-6 text-white md:p-10", children: _jsxs("div", { className: "mx-auto max-w-5xl space-y-8", children: [_jsxs("header", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-yellow-400", children: "FlixCasa Admin" }), _jsx("p", { className: "text-sm text-zinc-400", children: "CasaOS Server Control Panel \u2014 Login metadata only, no watch history" })] }), _jsxs("button", { onClick: fetchData, className: "flex items-center gap-2 rounded bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-yellow-400", children: [_jsx(RefreshCw, { className: "h-4 w-4" }), " Refresh"] })] }), _jsxs("section", { className: "grid gap-6 lg:grid-cols-[1fr_1fr]", children: [_jsxs("div", { className: "rounded-lg border border-zinc-800 bg-zinc-900 p-6", children: [_jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold", children: "System health" }), _jsx("p", { className: "mt-1 text-sm text-zinc-400", children: "Run the server-side smoke checks before publishing." })] }), _jsxs("button", { onClick: () => void runTests(), disabled: testStatus === "running", className: "flex items-center gap-2 rounded bg-cyan-400 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50", children: [_jsx(Play, { className: "h-4 w-4" }), " Test all"] })] }), testStatus === "passed" && _jsxs("p", { className: "mt-4 flex items-center gap-2 text-sm font-semibold text-green-400", children: [_jsx(CheckCircle2, { className: "h-4 w-4" }), " TESTING COMPLETE - ALL GOOD & SYSTEM HEALTHY"] }), testStatus === "failed" && _jsxs("p", { className: "mt-4 flex items-center gap-2 text-sm text-red-400", children: [_jsx(AlertTriangle, { className: "h-4 w-4" }), " Checks need attention before publishing."] }), _jsx("div", { className: "mt-4 space-y-2", children: checks.map((check) => _jsxs("div", { className: "flex items-center justify-between border-t border-zinc-800 py-2 text-sm", children: [_jsx("span", { children: check.name }), _jsx("span", { className: check.ok ? "text-green-400" : "text-red-400", children: check.ok ? "PASS" : check.detail })] }, check.name)) })] }), _jsxs("div", { className: "rounded-lg border border-zinc-800 bg-zinc-900 p-6", children: [_jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsxs("h2", { className: "flex items-center gap-2 text-lg font-semibold", children: [_jsx(Rocket, { className: "h-4 w-4 text-cyan-300" }), " Force update publisher"] }), _jsxs("p", { className: "mt-1 text-sm text-zinc-400", children: ["Current minimum: ", releaseVersion || "not loaded"] })] }), _jsx("button", { onClick: () => void publishUpdate(), disabled: testStatus !== "passed", className: "rounded bg-yellow-400 px-3 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40", children: "Confirm & Publish Update App" })] }), _jsx("p", { className: "mt-5 text-xs text-zinc-500", children: "Publishing increments the server minimum version. Active clients receive a non-dismissible update screen on their next version poll." })] })] }), _jsxs("section", { className: "rounded-lg border border-zinc-800 bg-zinc-900 p-6", children: [_jsxs("h2", { className: "flex items-center gap-2 text-lg font-semibold", children: [_jsx(Bot, { className: "h-5 w-5 text-cyan-300" }), " AI coding assistant"] }), _jsx("p", { className: "mt-1 text-sm text-zinc-400", children: "Describe a change to generate a reviewable side-by-side preview. No files are changed unless an approved AI provider is configured." }), _jsxs("div", { className: "mt-4 grid gap-4 lg:grid-cols-2", children: [_jsx("textarea", { value: assistantPrompt, onChange: (event) => setAssistantPrompt(event.target.value), placeholder: "Ask for a UI or feature change...", className: "min-h-32 rounded border border-zinc-700 bg-zinc-950 p-3 text-sm text-white outline-none focus:border-cyan-300" }), _jsx("div", { className: "min-h-32 whitespace-pre-wrap rounded border border-zinc-800 bg-black p-3 font-mono text-xs text-zinc-300", children: assistantPreview || "AI preview will appear here." })] }), _jsx("button", { onClick: () => void askAssistant(), className: "mt-3 rounded bg-zinc-700 px-4 py-2 text-sm hover:bg-zinc-600", children: "Generate preview" })] }), _jsxs("section", { className: "rounded-lg bg-zinc-900 p-6", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Connected Google Accounts" }), _jsxs("div", { className: "space-y-3", children: [accounts.length === 0 && (_jsx("p", { className: "text-zinc-500", children: "No accounts connected yet." })), accounts.map((account) => (_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4 rounded-lg bg-zinc-800 p-4", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("span", { className: `h-3 w-3 rounded-full ${account.isOnline ? "bg-green-400" : "bg-zinc-600"}`, title: account.isOnline ? "Online" : "Offline" }), _jsxs("div", { children: [_jsxs("p", { className: "font-medium", children: [account.name, account.isRootAdmin && (_jsx("span", { className: "ml-2 rounded bg-yellow-400/20 px-2 py-0.5 text-xs text-yellow-400", children: "Root Admin" }))] }), _jsx("p", { className: "text-sm text-zinc-400", children: account.email }), _jsxs("p", { className: "text-xs text-zinc-500", children: ["Last seen: ", new Date(account.lastSeen).toLocaleString(), " \u00B7", " ", account.isOnline ? "ONLINE" : "OFFLINE"] })] })] }), _jsx("div", { className: "flex gap-2", children: account.isRootAdmin ? (_jsx("span", { className: "rounded bg-zinc-700 px-3 py-1.5 text-xs text-zinc-400", children: "Protected" })) : (_jsxs(_Fragment, { children: [account.isBlocked ? (_jsxs("button", { onClick: () => handleAction(account.id, "unblock"), className: "flex items-center gap-1 rounded bg-green-800 px-3 py-1.5 text-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-yellow-400", children: [_jsx(Unlock, { className: "h-3.5 w-3.5" }), " Unblock"] })) : (_jsxs("button", { onClick: () => handleAction(account.id, "block"), className: "flex items-center gap-1 rounded bg-red-900 px-3 py-1.5 text-sm hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-yellow-400", children: [_jsx(Ban, { className: "h-3.5 w-3.5" }), " Block"] })), _jsxs("button", { onClick: () => handleAction(account.id, "revoke"), className: "flex items-center gap-1 rounded bg-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-400", children: [_jsx(LogOut, { className: "h-3.5 w-3.5" }), " Revoke Session"] })] })) })] }, account.id)))] })] }), downloader && (_jsxs("section", { className: "rounded-lg bg-zinc-900 p-6", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "CasaOS Downloader Engine" }), _jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [_jsxs("div", { className: "rounded bg-zinc-800 p-4", children: [_jsx("p", { className: "text-xs text-zinc-400", children: "Download Path" }), _jsx("p", { className: "font-mono text-sm", children: downloader.path })] }), _jsxs("div", { className: "rounded bg-zinc-800 p-4", children: [_jsx("p", { className: "text-xs text-zinc-400", children: "Memory Footprint" }), _jsx("p", { className: "text-sm text-green-400", children: downloader.memory })] }), _jsxs("div", { className: "rounded bg-zinc-800 p-4", children: [_jsx("p", { className: "text-xs text-zinc-400", children: "Active Jobs" }), _jsx("p", { className: "text-sm", children: downloader.jobs.length })] })] }), downloader.jobs.length > 0 && (_jsx("div", { className: "mt-4 space-y-2", children: downloader.jobs.map((job) => (_jsxs("div", { className: "flex items-center justify-between rounded bg-zinc-800 px-4 py-2 text-sm", children: [_jsx("span", { children: job.title }), _jsxs("span", { className: "text-zinc-400", children: [job.status, " \u2014 ", job.progress, "%"] })] }, job.id))) }))] })), _jsxs("section", { className: "rounded-lg bg-zinc-900 p-6", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Active Sessions" }), sessions.length === 0 && _jsx("p", { className: "text-zinc-500", children: "No active sessions" }), _jsx("div", { className: "space-y-2", children: sessions.map((s) => (_jsxs("div", { className: "flex items-center justify-between rounded-lg bg-zinc-800 p-3", children: [_jsxs("div", { children: [_jsxs("p", { className: "font-medium", children: [s.accountEmail || s.accountId, " \u00B7 ", s.ip || "unknown"] }), _jsx("p", { className: "text-sm text-zinc-400", children: s.userAgent || "(unknown device)" }), _jsxs("p", { className: "text-xs text-zinc-500", children: ["Logged: ", new Date(s.createdAt).toLocaleString()] })] }), _jsx("div", { children: _jsx("button", { onClick: () => handleRevokeSession(s.token), className: "rounded bg-red-800 px-3 py-1.5 text-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-yellow-400", children: "Force Sign-Out" }) })] }, s.token))) })] })] }) }));
}
