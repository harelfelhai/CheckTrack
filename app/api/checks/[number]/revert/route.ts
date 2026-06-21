import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { auth } from "@/auth";
import { isManager } from "@/lib/auth-config";

export const runtime = "nodejs";

/**
 * POST /api/checks/[number]/revert — manager-only. Returns a delivered check to
 * "not delivered" with a full reset: clears signer name, delivery time and the
 * signed-PDF link (spec addition, manager action).
 */
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ number: string }> },
) {
  const session = await auth();
  if (!isManager(session?.user?.email)) {
    return NextResponse.json({ error: "פעולה זו מותרת למנהל בלבד" }, { status: 403 });
  }

  const { number } = await ctx.params;
  const store = await getStore();
  const updated = await store.updateCheck(decodeURIComponent(number), {
    status: "not_delivered",
    deliveredAt: null,
    signerName: null,
    fileUrl: null,
  });
  if (!updated) return NextResponse.json({ error: "הצ'ק לא נמצא" }, { status: 404 });
  return NextResponse.json({ check: updated });
}
