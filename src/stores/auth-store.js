"use client";
import { create } from "zustand";
import { getEncryptedItem, setEncryptedItem } from "@/lib/storage";
export const useAuthStore = create((set, get) => ({
    account: null,
    isLoading: true,
    isAuthenticated: false,
    setAccount: (account) => set({ account, isAuthenticated: !!account }),
    setLoading: (isLoading) => set({ isLoading }),
    login: async (email, name, picture) => {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, name, picture }),
        });
        if (!res.ok)
            throw new Error("Login failed");
        const data = await res.json();
        const account = data.account;
        await setEncryptedItem("session", { accountId: account.id, email: account.email }, account.id);
        set({ account, isAuthenticated: true, isLoading: false });
    },
    logout: async () => {
        const { account } = get();
        await fetch("/api/auth/logout", { method: "POST" });
        if (account) {
            const { removeEncryptedItem } = await import("@/lib/storage");
            removeEncryptedItem("session", account.id);
        }
        set({ account: null, isAuthenticated: false, isLoading: false });
    },
    hydrate: async () => {
        try {
            const res = await fetch("/api/auth/session");
            if (res.ok) {
                const data = await res.json();
                set({ account: data.account, isAuthenticated: true, isLoading: false });
                return;
            }
        }
        catch (_a) {
            /* session expired */
        }
        set({ account: null, isAuthenticated: false, isLoading: false });
    },
}));
export const useSettingsStore = create((set, get) => ({
    settings: { theme: "dark", audioPriority: "auto", qualityPreference: "auto" },
    updateSettings: (partial) => {
        set((s) => ({ settings: Object.assign(Object.assign({}, s.settings), partial) }));
    },
    hydrate: async (accountId) => {
        const stored = await getEncryptedItem("settings", accountId);
        if (stored)
            set({ settings: stored });
    },
    persist: async (accountId) => {
        await setEncryptedItem("settings", get().settings, accountId);
    },
}));
