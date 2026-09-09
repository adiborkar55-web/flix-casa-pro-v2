"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useCallback, useState } from "react";
import { useAuthStore, useSettingsStore } from "@/stores/auth-store";
import { useProfileStore } from "@/stores/profile-store";
import { useLibraryStore } from "@/stores/library-store";
import { FlixSplash } from "@/components/flix-splash";
import { ForceUpdateGuard } from "@/components/force-update-guard";
export function AppProvider({ children }) {
    const [initialized, setInitialized] = useState(false);
    const hydrateAuth = useAuthStore((s) => s.hydrate);
    const setAuthLoading = useAuthStore((s) => s.setLoading);
    const account = useAuthStore((s) => s.account);
    const hydrateProfiles = useProfileStore((s) => s.hydrate);
    const setActiveProfile = useProfileStore((s) => s.setActiveProfile);
    const hydrateLibrary = useLibraryStore((s) => s.hydrate);
    const hydrateSettings = useSettingsStore((s) => s.hydrate);
    const initialize = useCallback(async () => {
        setAuthLoading(true);
        try {
            await hydrateAuth();
            const currentAccount = useAuthStore.getState().account;
            if (currentAccount) {
                await Promise.all([
                    hydrateProfiles(currentAccount.id),
                    hydrateLibrary(currentAccount.id),
                    hydrateSettings(currentAccount.id),
                ]);
            }
            else {
                setActiveProfile(null);
            }
        }
        catch (_a) {
            setActiveProfile(null);
        }
        finally {
            setAuthLoading(false);
            setInitialized(true);
        }
    }, [hydrateAuth, hydrateProfiles, hydrateLibrary, hydrateSettings, setActiveProfile, setAuthLoading]);
    useEffect(() => {
        void initialize();
    }, [initialize]);
    useEffect(() => {
        if (!account) {
            setActiveProfile(null);
            return;
        }
        void Promise.all([
            hydrateProfiles(account.id),
            hydrateLibrary(account.id),
            hydrateSettings(account.id),
        ]);
    }, [account, hydrateProfiles, hydrateLibrary, hydrateSettings, setActiveProfile]);
    return (_jsxs(ForceUpdateGuard, { children: [children, _jsx(FlixSplash, { appReady: initialized })] }));
}
