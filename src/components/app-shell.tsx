"use client";

import { type ReactNode } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useProfileStore } from "@/stores/profile-store";
import Link from "next/link";
import { Settings, LogOut, Home, Film, Tv, Heart, Sparkles } from "lucide-react";

interface AppShellProps {
  children: ReactNode;
  showNav?: boolean;
}

const navItems = [
  { href: "/browse", label: "Home", icon: Home },
  { href: "/browse?tab=movies", label: "Movies", icon: Film },
  { href: "/browse?tab=tv", label: "TV Series", icon: Tv },
  { href: "/browse?tab=kids", label: "Kids", icon: Sparkles },
  { href: "/browse?tab=library", label: "My List", icon: Heart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children, showNav = true }: AppShellProps) {
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const activeProfile = useProfileStore((s) => s.activeProfile);

  if (isLoading && !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
          <p className="text-zinc-400">Loading FlixCasa Pro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {showNav && isAuthenticated && activeProfile && (
        <>
          <nav className="fixed top-0 z-40 hidden w-64 flex-col justify-between border-r border-zinc-800 bg-zinc-950/95 px-4 py-5 md:flex md:h-screen">
            <div className="space-y-3">
              <Link href="/browse" className="mb-6 block text-2xl font-bold text-yellow-400 focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:scale-105 transition-all duration-200">
                FlixCasa
              </Link>
              <div className="space-y-1">
                {navItems.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-300 transition-all duration-200 hover:bg-zinc-800 hover:text-white focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:scale-105"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
              <p className="text-sm text-zinc-400">Signed in as</p>
              <div className="flex items-center justify-between">
                <span className="font-medium">{activeProfile.name}</span>
                <button onClick={() => void logout()} className="rounded p-2 text-zinc-300 hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:scale-105 transition-all duration-200" aria-label="Sign out">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </nav>

          <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-zinc-800 bg-zinc-950/95 px-2 py-2 md:hidden">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] text-zinc-400 transition-all duration-200 hover:text-white focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:scale-105"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </>
      )}
      <main className={showNav && isAuthenticated ? "pb-20 md:pb-0 md:pl-64" : ""}>{children}</main>
    </div>
  );
}
