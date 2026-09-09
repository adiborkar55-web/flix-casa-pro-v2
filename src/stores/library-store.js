"use client";
import { create } from "zustand";
import { getEncryptedItem, setEncryptedItem } from "@/lib/storage";
export const useLibraryStore = create((set, get) => ({
    myList: [],
    watchHistory: [],
    searchHistory: [],
    isLoading: true,
    hydrate: async (accountId) => {
        const [myList, watchHistory, searchHistory] = await Promise.all([
            getEncryptedItem("myList", accountId),
            getEncryptedItem("watchHistory", accountId),
            getEncryptedItem("searchHistory", accountId),
        ]);
        set({
            myList: myList || [],
            watchHistory: watchHistory || [],
            searchHistory: searchHistory || [],
            isLoading: false,
        });
    },
    addToMyList: async (accountId, item) => {
        if (get().myList.some((m) => m.id === item.id))
            return;
        const myList = [...get().myList, item];
        await setEncryptedItem("myList", myList, accountId);
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
        set({ watchHistory: trimmed });
    },
    addSearch: async (accountId, query) => {
        const searches = [query, ...get().searchHistory.filter((s) => s !== query)].slice(0, 20);
        await setEncryptedItem("searchHistory", searches, accountId);
        set({ searchHistory: searches });
    },
}));
