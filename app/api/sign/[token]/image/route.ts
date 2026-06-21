import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { verifySigningToken } from "@/lib/tokens";
import { imageResponse } from "@/lib/image";

export const runtime = "nodejs";

/**
 * GET /api/sign/[token]/image — public. Returns the check's scan to the remote
 * signer, gated by a valid signing token (no login). 404 when no scan exists.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const claims = await verifySigningToken(token);
  if (!claims) return NextResponse.json({ error: "קישור לא תקין" }, { status: 400 });

  const store = await getStore();
  const dataUrl = await store.getImage(claims.checkNumber);
  return imageResponse(dataUrl) ?? NextResponse.json({ error: "אין צילום" }, { status: 404 });
}
