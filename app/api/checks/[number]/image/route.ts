import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { imageResponse } from "@/lib/image";

export const runtime = "nodejs";

/**
 * GET /api/checks/[number]/image — returns the archived scan of a check as an
 * image response (for the dashboard "צפה בצילום"). Auth-gated by middleware
 * (under /api/checks). 404 when no scan was stored.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ number: string }> },
) {
  const { number } = await ctx.params;
  const store = await getStore();
  const dataUrl = await store.getImage(decodeURIComponent(number));
  return imageResponse(dataUrl) ?? NextResponse.json({ error: "אין צילום לצ'ק זה" }, { status: 404 });
}
