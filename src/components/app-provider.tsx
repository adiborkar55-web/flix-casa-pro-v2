"use client";

import { useEffect, useCallback, useState, type ReactNode } from "react";
import { useAuthStore, useSettingsStore } from "@/stores/auth-store";
import { useProfileStore } from "@/stores/profile-store";
import { useLibraryStore } from "@/stores/library-store";
import { FlixSplash } from "@/components/flix-splash";
import { ForceUpdateGuard } from "@/components/force-update-guard";
import { useDeviceType } from "@/hooks/use-device-type";
import { updatePresence } from "@/lib/cloud-sync";
import UpdateChecker from "@/components/UpdateChecker";

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  useDeviceType();
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
      } else {
        setActiveProfile(null);
      }
    } catch {
      setActiveProfile(null);
    } finally {
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

  useEffect(() => {
    if (!account) return;
    void updatePresence(account.id, true);
    const heartbeat = window.setInterval(() => void updatePresence(account.id, true), 30_000);
    const markOffline = () => void updatePresence(account.id, false);
    window.addEventListener("pagehide", markOffline);
    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener("pagehide", markOffline);
      markOffline();
    };
  }, [account]);

  return (
    <ForceUpdateGuard>
      {children}
      <UpdateChecker />
      <FlixSplash appReady={initialized} />
    </ForceUpdateGuard>
  );
}
