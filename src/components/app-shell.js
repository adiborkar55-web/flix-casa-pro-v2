"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useAuthStore } from "@/stores/auth-store";
import { useProfileStore } from "@/stores/profile-store";
import Link from "next/link";
import { Settings, LogOut, Home, Film, Tv, Heart, Sparkles } from "lucide-react";
const navItems = [
    { href: "/browse", label: "Home", icon: Home },
    { href: "/browse?tab=movies", label: "Movies", icon: Film },
    { href: "/browse?tab=tv", label: "TV Series", icon: Tv },
    { href: "/browse?tab=kids", label: "Kids", icon: Sparkles },
    { href: "/browse?tab=library", label: "My List", icon: Heart },
    { href: "/settings", label: "Settings", icon: Settings },
];
export function AppShell({ children, showNav = true }) {
    const isLoading = useAuthStore((s) => s.isLoading);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const logout = useAuthStore((s) => s.logout);
    const activeProfile = useProfileStore((s) => s.activeProfile);
    if (isLoading && !isAuthenticated) {
        return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-zinc-950", children: _jsxs("div", { className: "flex flex-col items-center gap-4", children: [_jsx("div", { className: "h-14 w-14 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" }), _jsx("p", { className: "text-zinc-400", children: "Loading FlixCasa Pro..." })] }) }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-zinc-950 text-white", children: [showNav && isAuthenticated && activeProfile && (_jsxs(_Fragment, { children: [_jsxs("nav", { className: "fixed top-0 z-40 hidden w-64 flex-col justify-between border-r border-zinc-800 bg-zinc-950/95 px-4 py-5 md:flex md:h-screen", children: [_jsxs("div", { className: "space-y-3", children: [_jsx(Link, { href: "/browse", className: "mb-6 block text-2xl font-bold text-yellow-400 focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:scale-105 transition-all duration-200", children: "FlixCasa" }), _jsx("div", { className: "space-y-1", children: navItems.map(({ href, label, icon: Icon }) => (_jsxs(Link, { href: href, className: "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-300 transition-all duration-200 hover:bg-zinc-800 hover:text-white focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:scale-105", children: [_jsx(Icon, { className: "h-4 w-4" }), label] }, href))) })] }), _jsxs("div", { className: "space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3", children: [_jsx("p", { className: "text-sm text-zinc-400", children: "Signed in as" }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "font-medium", children: activeProfile.name }), _jsx("button", { onClick: () => void logout(), className: "rounded p-2 text-zinc-300 hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:scale-105 transition-all duration-200", "aria-label": "Sign out", children: _jsx(LogOut, { className: "h-4 w-4" }) })] })] })] }), _jsx("nav", { className: "fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-zinc-800 bg-zinc-950/95 px-2 py-2 md:hidden", children: navItems.map(({ href, label, icon: Icon }) => (_jsxs(Link, { href: href, className: "flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] text-zinc-400 transition-all duration-200 hover:text-white focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:scale-105", children: [_jsx(Icon, { className: "h-4 w-4" }), label] }, href))) })] })), _jsx("main", { className: showNav && isAuthenticated ? "pb-20 md:pb-0 md:pl-64" : "", children: children })] }));
}
