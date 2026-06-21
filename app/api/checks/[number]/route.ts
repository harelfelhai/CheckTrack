import { NextRequest, NextResponse } from "next/server";
import { validateSignature } from "@/lib/validation";
import { applySignature } from "@/lib/sign";
import { getStore } from "@/lib/store";
import { auth } from "@/auth";
import { isManager } from "@/lib/auth-config";
import type { SignatureInput } from "@/lib/types";

export const runtime = "nodejs";

/** Guards a manager-only action; returns an error response or null if allowed. */
async function requireManager(): Promise<NextResponse | null> {
  const session = await auth();
  if (!isManager(session?.user?.email)) {
    return NextResponse.json({ error: "פעולה זו מותרת למנהל בלבד" }, { status: 403 });
  }
  return null;
}

/**
 * PATCH /api/checks/[number] — apply a frontal signature and close the check
 * as "delivered" (spec §4, מסך 1 שלב ג' / "החתמה פרונטלית").
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ number: string }> },
) {
  const { number } = await ctx.params;

  let body: SignatureInput & { imageDataUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "גוף הבקשה אינו תקין" }, { status: 400 });
  }

  const errors = validateSignature(body);
  if (errors.length) {
    return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
  }

  const result = await applySignature(decodeURIComponent(number), {
    signerName: body.signerName,
    signatureDataUrl: body.signatureDataUrl,
    imageDataUrl: body.imageDataUrl,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ check: result.check });
}

/**
 * DELETE /api/checks/[number] — manager-only. Permanently removes the check row
 * and its archived Drive files (signed PDF + scan). "מחיקה גורפת".
 */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ number: string }> },
) {
  const denied = await requireManager();
  if (denied) return denied;

  const { number } = await ctx.params;
  const store = await getStore();
  const ok = await store.deleteCheck(decodeURIComponent(number));
  if (!ok) return NextResponse.json({ error: "הצ'ק לא נמצא" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
