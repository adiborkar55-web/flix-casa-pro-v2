import { NextResponse } from "next/server";
import { getReleaseInfo } from "@/lib/server/release-store";
export async function GET() {
    return NextResponse.json(await getReleaseInfo(), {
        headers: { "Cache-Control": "no-store, max-age=0" },
    });
}
