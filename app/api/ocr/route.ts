import { NextRequest, NextResponse } from "next/server";
import { runOcr } from "@/lib/ocr";
import { auth } from "@/auth";
import { isAuthEnabled, isAllowedEmail } from "@/lib/auth-config";

export const runtime = "nodejs";

// Cap the request so a caller can't blow up memory or inflate the paid Gemini
// bill with a giant data URL. ~8 MB of base64 ≈ a ~6 MB image — plenty.
const MAX_BODY_BYTES = 8 * 1024 * 1024;

/**
 * POST /api/ocr — extract draft check fields from a captured image (spec §5.ב).
 * Returns { enabled, checkNumber, amount, writtenDate, rawText }. When OCR is
 * not configured, `enabled: false` and the fields are null (no cost).
 *
 * Auth-gated (middleware + this defense-in-depth check) because every call hits
 * the paid Gemini API — it must never be reachable unauthenticated.
 */
export async function POST(req: NextRequest) {
  if (isAuthEnabled()) {
    const session = await auth();
    if (!isAllowedEmail(session?.user?.email)) {
      return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    }
  }

  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "התמונה גדולה מדי" }, { status: 413 });
  }

  let body: { imageDataUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "גוף הבקשה אינו תקין" }, { status: 400 });
  }

  if (!body.imageDataUrl?.startsWith("data:image")) {
    return NextResponse.json({ error: "חסרה תמונה לחילוץ" }, { status: 400 });
  }
  if (body.imageDataUrl.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "התמונה גדולה מדי" }, { status: 413 });
  }

  try {
    const result = await runOcr(body.imageDataUrl);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "חילוץ ה-OCR נכשל" },
      { status: 502 },
    );
  }
}
