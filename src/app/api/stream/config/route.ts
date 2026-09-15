import { NextResponse } from "next/server";
import { getControlConfig } from "@/lib/server/control-store";

export async function GET() {
  const controls = await getControlConfig();
  const servers = controls.sources
    .filter((source) => source.enabled && Boolean(source.url))
    .sort((left, right) => left.priority - right.priority)
    .map((source) => ({ label: source.label, url: source.url, autoplay: true, lang: "hi" }));

  return NextResponse.json({
    servers,
    sources: controls.sources,
    catalog: controls.catalog,
    featureFlags: { autoSwitch: true, adBlocking: true },
    updatedAt: controls.updatedAt,
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}