import { NextRequest, NextResponse } from "next/server";
import { validateSignature } from "@/lib/validation";
import { applySignature } from "@/lib/sign";
import type { SignatureInput } from "@/lib/types";

export const runtime = "nodejs";

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
