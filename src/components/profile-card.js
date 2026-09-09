"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Trash2, Pencil } from "lucide-react";
import { useState } from "react";
export function ProfileCard({ profile, onSelect, onEdit, onDelete, isAdd, onAdd }) {
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState(profile.name);
    if (isAdd) {
        return (_jsxs("button", { onClick: onAdd, className: "group flex flex-col items-center gap-3 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-yellow-400", children: [_jsx("div", { className: "flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-zinc-600 text-4xl text-zinc-500 transition-colors group-hover:border-yellow-400 group-hover:text-yellow-400 md:h-32 md:w-32", children: "+" }), _jsx("span", { className: "text-sm text-zinc-400 group-hover:text-white", children: "Add Profile" })] }));
    }
    const handleSaveEdit = () => {
        if (editName.trim() && onEdit) {
            onEdit(profile, editName.trim());
            setEditing(false);
        }
    };
    return (_jsxs("div", { className: "group relative flex flex-col items-center gap-3", children: [_jsxs("button", { onClick: () => onSelect(profile), className: "flex flex-col items-center gap-3 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-yellow-400", children: [_jsx("div", { className: "flex h-24 w-24 items-center justify-center rounded-lg bg-zinc-800 text-5xl transition-transform group-hover:scale-105 md:h-32 md:w-32", children: profile.avatar }), editing ? (_jsx("input", { value: editName, onChange: (e) => setEditName(e.target.value), onBlur: handleSaveEdit, onKeyDown: (e) => e.key === "Enter" && handleSaveEdit(), className: "w-28 rounded bg-zinc-800 px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400", autoFocus: true, onClick: (e) => e.stopPropagation() })) : (_jsx("span", { className: "text-sm text-zinc-300 group-hover:text-white", children: profile.name }))] }), !profile.isKids && (_jsxs("div", { className: "flex gap-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100", children: [_jsx("button", { onClick: () => setEditing(true), className: "rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400", "aria-label": "Edit profile", children: _jsx(Pencil, { className: "h-4 w-4" }) }), _jsx("button", { onClick: () => onDelete === null || onDelete === void 0 ? void 0 : onDelete(profile), className: "rounded p-1.5 text-zinc-400 hover:bg-red-900/50 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-yellow-400", "aria-label": "Delete profile", children: _jsx(Trash2, { className: "h-4 w-4" }) })] }))] }));
}
