const LOCAL_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
export function isLocalOrCasaOSRequest(request) {
    var _a, _b;
    const host = request.headers.get("host") || "";
    const hostname = host.split(":")[0].toLowerCase();
    if (LOCAL_HOSTS.has(hostname))
        return true;
    const forwarded = (_b = (_a = request.headers.get("x-forwarded-for")) === null || _a === void 0 ? void 0 : _a.split(",")[0]) === null || _b === void 0 ? void 0 : _b.trim();
    if (forwarded && LOCAL_HOSTS.has(forwarded))
        return true;
    const realIp = request.headers.get("x-real-ip");
    if (realIp && LOCAL_HOSTS.has(realIp))
        return true;
    if (hostname.endsWith(".local"))
        return true;
    const casaHost = process.env.CASAOS_HOST;
    if (casaHost && hostname === casaHost.toLowerCase())
        return true;
    return false;
}
export function isAdminRoute(pathname) {
    return pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
}
