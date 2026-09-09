"use client";

import { create } from "zustand";
import type { GoogleAccount, UserSettings } from "@/types";
import { cloudApi } from "@/lib/cloud-api";
import { getEncryptedItem, setEncryptedItem } from "@/lib/storage";
import { getSupabaseSession, supabase } from "@/lib/supabase";

interface AuthState {
  account: GoogleAccount | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setAccount: (account: GoogleAccount | null) => void;
  setLoading: (loading: boolean) => void;
  login: (email: string, name: string, picture?: string, password?: string, mode?: "login" | "signup") => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  account: null,
  isLoading: true,
  isAuthenticated: false,

  setAccount: (account) => set({ account, isAuthenticated: !!account }),
  setLoading: (isLoading) => set({ isLoading }),

  login: async (email, name, picture, password = "", mode = "login") => {
    const res = await fetch(cloudApi("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, name, picture, password, mode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    const account: GoogleAccount = data.account;
    if (mode === "signup") {
      await supabase.auth.signUp({ email, password, options: { data: { name: account.name, picture: account.picture } } }).catch(() => undefined);
    } else {
      await supabase.auth.signInWithPassword({ email, password }).catch(() => undefined);
    }
    await setEncryptedItem("session", { accountId: account.id, email: account.email }, account.id);
    const persistentSession = data.token || JSON.stringify({ accountId: account.id, email: account.email, name: account.name });
    window.localStorage.setItem("FLIXCASA_SESSION", persistentSession);
    window.localStorage.setItem("FLIXCASA_PERSISTENT_USER_SESSION", persistentSession);
    window.localStorage.setItem("FLIXCASA_USER_SESSION", JSON.stringify({ accountId: account.id, email: account.email, name: account.name }));
    document.cookie = `FLIXCASA_SESSION=${encodeURIComponent(persistentSession)}; Max-Age=315360000; Path=/; SameSite=Strict`;
    set({ account, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    const { account } = get();
    await fetch(cloudApi("/api/auth/logout"), { method: "POST", credentials: "include" });
    await supabase.auth.signOut().catch(() => undefined);
    if (account) {
      const { removeEncryptedItem } = await import("@/lib/storage");
      removeEncryptedItem("session", account.id);
    }
    set({ account: null, isAuthenticated: false, isLoading: false });
    window.localStorage.removeItem("FLIXCASA_USER_SESSION");
    window.localStorage.removeItem("FLIXCASA_SESSION");
    window.localStorage.removeItem("FLIXCASA_PERSISTENT_USER_SESSION");
    document.cookie = "FLIXCASA_SESSION=; Max-Age=0; Path=/; SameSite=Strict";
  },

  hydrate: async () => {
    try {
      const persisted = window.localStorage.getItem("FLIXCASA_PERSISTENT_USER_SESSION") || window.localStorage.getItem("FLIXCASA_SESSION");
      const token = persisted && !persisted.startsWith("{") ? persisted : "";
      const res = await fetch(cloudApi("/api/auth/session"), {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        set({ account: data.account, isAuthenticated: true, isLoading: false });
        return;
      }
    } catch {
      /* session expired */
    }
    const supabaseSession = await getSupabaseSession().catch(() => null);
    if (supabaseSession?.user) {
      const user = supabaseSession.user;
      const account: GoogleAccount = {
        id: user.id,
        email: user.email || "",
        name: String(user.user_metadata?.name || user.email?.split("@")[0] || "User"),
        picture: typeof user.user_metadata?.picture === "string" ? user.user_metadata.picture : undefined,
        isOnline: true,
        lastSeen: new Date().toISOString(),
        isBlocked: false,
        isRootAdmin: false,
      };
      set({ account, isAuthenticated: true, isLoading: false });
      return;
    }
    set({ account: null, isAuthenticated: false, isLoading: false });
  },
}));

export const useSettingsStore = create<{
  settings: UserSettings;
  updateSettings: (partial: Partial<UserSettings>) => void;
  hydrate: (accountId: string) => Promise<void>;
  persist: (accountId: string) => Promise<void>;
}>((set, get) => ({
  settings: { theme: "dark", audioPriority: "auto", qualityPreference: "auto", autoPlayNext: true, autoSelectServer: true },

  updateSettings: (partial) => {
    set((s) => ({ settings: { ...s.settings, ...partial } }));
  },

  hydrate: async (accountId) => {
    const stored = await getEncryptedItem<UserSettings>("settings", accountId);
    if (stored) set({ settings: stored });
  },

  persist: async (accountId) => {
    await setEncryptedItem("settings", get().settings, accountId);
  },
}));
