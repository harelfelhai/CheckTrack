import { NextRequest, NextResponse } from "next/server";
import { runOcr } from "@/lib/ocr";
import { auth } from "@/auth";
import { isAuthEnabled, isAllowedEmail } from "@/lib/auth-config";

export const runtime = "nodejs";

// Generous backstop only. Normal large photos are shrunk client-side before
// upload (lib/image-compress.ts), so this should essentially never trigger — it
// just stops a pathological payload from blowing up memory / the Gemini bill.
const MAX_BODY_BYTES = 25 * 1024 * 1024;

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
    return NextResponse.json({ error: "התמונה גדולה מאוד — נסו לצלם שוב או לחתוך אותה" }, { status: 413 });
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
    return NextResponse.json({ error: "התמונה גדולה מאוד — נסו לצלם שוב או לחתוך אותה" }, { status: 413 });
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
