"use client";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Plus, Check } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useLibraryStore } from "@/stores/library-store";
export function MyListButton({ item, className = "" }) {
    const account = useAuthStore((s) => s.account);
    const isInMyList = useLibraryStore((s) => s.isInMyList(item.id));
    const addToMyList = useLibraryStore((s) => s.addToMyList);
    const removeFromMyList = useLibraryStore((s) => s.removeFromMyList);
    const toggle = async (e) => {
        e.stopPropagation();
        if (!account)
            return;
        if (isInMyList) {
            await removeFromMyList(account.id, item.id);
        }
        else {
            await addToMyList(account.id, item);
        }
    };
    return (_jsx("button", { onClick: toggle, className: `flex items-center gap-2 rounded bg-zinc-800/80 px-4 py-2 text-sm font-medium hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 ${className}`, "aria-label": isInMyList ? "Remove from My List" : "Add to My List", children: isInMyList ? (_jsxs(_Fragment, { children: [_jsx(Check, { className: "h-4 w-4 text-yellow-400" }), " My List"] })) : (_jsxs(_Fragment, { children: [_jsx(Plus, { className: "h-4 w-4" }), " My List"] })) }));
}
