export const CLOUD_API_BASE = "https://flix-casa-pro-v2.vercel.app";

export function cloudApi(path: string) {
  return `${CLOUD_API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}
