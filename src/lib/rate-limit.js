const store = new Map();
const WINDOW_MS = 60000;
const MAX_REQUESTS = 60;
export function rateLimit(ip, endpoint) {
    const key = `${ip}:${endpoint}`;
    const now = Date.now();
    const entry = store.get(key);
    if (!entry || now > entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + WINDOW_MS });
        return { allowed: true, remaining: MAX_REQUESTS - 1 };
    }
    entry.count++;
    if (entry.count > MAX_REQUESTS) {
        return { allowed: false, remaining: 0 };
    }
    return { allowed: true, remaining: MAX_REQUESTS - entry.count };
}
export function getClientIp(request) {
    var _a, _b;
    return (((_b = (_a = request.headers.get("x-forwarded-for")) === null || _a === void 0 ? void 0 : _a.split(",")[0]) === null || _b === void 0 ? void 0 : _b.trim()) ||
        request.headers.get("x-real-ip") ||
        "unknown");
}
