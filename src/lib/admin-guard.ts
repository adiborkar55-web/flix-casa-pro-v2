const LOCAL_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

export function isLocalOrCasaOSRequest(request: Request): boolean {
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0].toLowerCase();

  if (LOCAL_HOSTS.has(hostname)) return true;

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded && LOCAL_HOSTS.has(forwarded)) return true;

  const realIp = request.headers.get("x-real-ip");
  if (realIp && LOCAL_HOSTS.has(realIp)) return true;

  if (hostname.endsWith(".local")) return true;

  const casaHost = process.env.CASAOS_HOST;
  if (casaHost && hostname === casaHost.toLowerCase()) return true;

  return false;
}

export function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
}
