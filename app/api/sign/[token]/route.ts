import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { verifySigningToken } from "@/lib/tokens";
import { validateSignature } from "@/lib/validation";
import { applySignature } from "@/lib/sign";
import type { SignatureInput } from "@/lib/types";

export const runtime = "nodejs";

/**
 * GET /api/sign/[token] — public. Returns minimal check details for the
 * external signing page (מסך 3), or a state indicating the link is
 * invalid / already used.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const claims = await verifySigningToken(token);
  if (!claims) {
    return NextResponse.json({ state: "invalid" }, { status: 200 });
  }

  const store = await getStore();
  if (await store.isTokenUsed(claims.jti)) {
    return NextResponse.json({ state: "used" }, { status: 200 });
  }

  const check = await store.getCheck(claims.checkNumber);
  if (!check) {
    return NextResponse.json({ state: "invalid" }, { status: 200 });
  }
  if (check.status === "delivered") {
    return NextResponse.json({ state: "signed" }, { status: 200 });
  }

  return NextResponse.json({
    state: "ok",
    companyName: process.env.COMPANY_NAME || "החברה שלנו",
    check: {
      checkNumber: check.checkNumber,
      amount: check.amount,
      writtenDate: check.writtenDate,
    },
  });
}

/**
 * POST /api/sign/[token] — public. Captures the signature, locks the link
 * one-time, marks the check delivered, and archives the signed PDF.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const claims = await verifySigningToken(token);
  if (!claims) {
    return NextResponse.json({ error: "קישור לא תקין" }, { status: 400 });
  }

  const store = await getStore();
  if (await store.isTokenUsed(claims.jti)) {
    return NextResponse.json({ error: "הקישור כבר נוצל" }, { status: 409 });
  }

  let body: SignatureInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "גוף הבקשה אינו תקין" }, { status: 400 });
  }

  const errors = validateSignature(body);
  if (errors.length) {
    return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
  }

  const result = await applySignature(claims.checkNumber, {
    signerName: body.signerName,
    signatureDataUrl: body.signatureDataUrl,
  });

  // Lock the link one-time regardless of whether the check was already
  // delivered by another path (prevents reuse).
  await store.markTokenUsed(claims.jti);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
