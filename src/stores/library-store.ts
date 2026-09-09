"use client";

import { create } from "zustand";
import type { MovieItem, WatchProgress } from "@/types";
import { getEncryptedItem, setEncryptedItem } from "@/lib/storage";
import { getSyncedCollections, syncCollection } from "@/lib/cloud-sync";

interface LibraryState {
  myList: MovieItem[];
  watchHistory: WatchProgress[];
  searchHistory: string[];
  isLoading: boolean;
  hydrate: (accountId: string) => Promise<void>;
  addToMyList: (accountId: string, item: MovieItem) => Promise<void>;
  removeFromMyList: (accountId: string, id: number) => Promise<void>;
  isInMyList: (id: number) => boolean;
  saveProgress: (accountId: string, progress: WatchProgress) => Promise<void>;
  clearWatchHistory: (accountId: string) => Promise<void>;
  addSearch: (accountId: string, query: string) => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  myList: [],
  watchHistory: [],
  searchHistory: [],
  isLoading: true,

  hydrate: async (accountId) => {
    const [myList, watchHistory, searchHistory, synced] = await Promise.all([
      getEncryptedItem<MovieItem[]>("myList", accountId),
      getEncryptedItem<WatchProgress[]>("watchHistory", accountId),
      getEncryptedItem<string[]>("searchHistory", accountId),
      getSyncedCollections(accountId),
    ]);
    set({
      myList: (synced.myList as MovieItem[] | undefined) || myList || [],
      watchHistory: (synced.watchHistory as WatchProgress[] | undefined) || watchHistory || [],
      searchHistory: searchHistory || [],
      isLoading: false,
    });
  },

  addToMyList: async (accountId, item) => {
    if (get().myList.some((m) => m.id === item.id)) return;
    const myList = [...get().myList, item];
    await setEncryptedItem("myList", myList, accountId);
    void syncCollection(accountId, "myList", myList);
    set({ myList });
  },

  removeFromMyList: async (accountId, id) => {
    const myList = get().myList.filter((m) => m.id !== id);
    await setEncryptedItem("myList", myList, accountId);
    set({ myList });
  },

  isInMyList: (id) => get().myList.some((m) => m.id === id),

  saveProgress: async (accountId, progress) => {
    const history = get().watchHistory.filter((h) => h.movieId !== progress.movieId);
    history.unshift(progress);
    const trimmed = history.slice(0, 100);
    await setEncryptedItem("watchHistory", trimmed, accountId);
    void syncCollection(accountId, "watchHistory", trimmed);
    set({ watchHistory: trimmed });
  },

  clearWatchHistory: async (accountId) => {
    await setEncryptedItem("watchHistory", [], accountId);
    set({ watchHistory: [] });
  },

  addSearch: async (accountId, query) => {
    const searches = [query, ...get().searchHistory.filter((s) => s !== query)].slice(0, 20);
    await setEncryptedItem("searchHistory", searches, accountId);
    set({ searchHistory: searches });
  },
}));
