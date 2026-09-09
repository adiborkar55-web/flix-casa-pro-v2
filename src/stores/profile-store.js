"use client";
import { create } from "zustand";
import { getEncryptedItem, setEncryptedItem } from "@/lib/storage";
const KIDS_AVATAR = "🧒";
const DEFAULT_AVATARS = ["🎬", "🎭", "🌟", "🎪", "🦁", "🐻", "🦊", "🐼"];
function createKidsProfile(accountId) {
    return {
        id: `kids-${accountId}`,
        name: "Kids",
        avatar: KIDS_AVATAR,
        isKids: true,
        accountId,
        createdAt: new Date().toISOString(),
    };
}
export const useProfileStore = create((set, get) => ({
    profiles: [],
    activeProfile: null,
    isLoading: true,
    hydrate: async (accountId) => {
        const stored = await getEncryptedItem("profiles", accountId);
        const kids = createKidsProfile(accountId);
        const existing = (stored === null || stored === void 0 ? void 0 : stored.filter(Boolean)) || [];
        const hasKids = existing.some((p) => p.isKids);
        const profiles = hasKids ? existing : [kids, ...existing];
        const currentActive = get().activeProfile;
        set({
            profiles,
            activeProfile: (currentActive === null || currentActive === void 0 ? void 0 : currentActive.accountId) === accountId ? currentActive : null,
            isLoading: false,
        });
    },
    setActiveProfile: (profile) => set({ activeProfile: profile }),
    addProfile: async (accountId, name) => {
        const trimmed = name.trim();
        if (!trimmed)
            throw new Error("Profile name is required");
        const profile = {
            id: crypto.randomUUID(),
            name: trimmed,
            avatar: DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)],
            isKids: false,
            accountId,
            createdAt: new Date().toISOString(),
        };
        const profiles = [...get().profiles, profile];
        await setEncryptedItem("profiles", profiles, accountId);
        set({ profiles });
        return profile;
    },
    updateProfile: async (accountId, id, updates) => {
        const profiles = get().profiles.map((p) => (p.id === id && !p.isKids ? Object.assign(Object.assign({}, p), updates) : p));
        await setEncryptedItem("profiles", profiles, accountId);
        set({ profiles });
        const active = get().activeProfile;
        if ((active === null || active === void 0 ? void 0 : active.id) === id)
            set({ activeProfile: Object.assign(Object.assign({}, active), updates) });
    },
    deleteProfile: async (accountId, id) => {
        var _a;
        const target = get().profiles.find((p) => p.id === id);
        if (!target || target.isKids)
            return;
        const profiles = get().profiles.filter((p) => p.id !== id);
        const hasKids = profiles.some((p) => p.isKids);
        const finalProfiles = hasKids ? profiles : [createKidsProfile(accountId), ...profiles];
        await setEncryptedItem("profiles", finalProfiles, accountId);
        set({ profiles: finalProfiles, activeProfile: ((_a = get().activeProfile) === null || _a === void 0 ? void 0 : _a.id) === id ? null : get().activeProfile });
    },
    getKidsProfile: (accountId) => get().profiles.find((p) => p.isKids && p.accountId === accountId),
}));
