const raw = (process.env.NEXT_PUBLIC_APP_VARIANT || "standard").toLowerCase();
export const APP_VARIANT = raw === "pro" || raw === "tv" ? raw : "standard";
export const isPro = APP_VARIANT === "pro";
export const isStandard = APP_VARIANT === "standard";
export const isTV = APP_VARIANT === "tv";
export const TV_FOCUS_RING = isTV ? "focus:ring-4 focus:ring-yellow-400" : "focus:ring-2 focus:ring-yellow-400";
export default {
    APP_VARIANT,
    isPro,
    isStandard,
    isTV,
    TV_FOCUS_RING,
};
