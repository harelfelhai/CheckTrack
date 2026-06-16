import { NextRequest, NextResponse } from "next/server";
import { runOcr } from "@/lib/ocr";

export const runtime = "nodejs";

/**
 * POST /api/ocr — extract draft check fields from a captured image (spec §5.ב).
 * Returns { enabled, checkNumber, amount, writtenDate, rawText }. When OCR is
 * not configured, `enabled: false` and the fields are null (no cost).
 */
export async function POST(req: NextRequest) {
  let body: { imageDataUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "גוף הבקשה אינו תקין" }, { status: 400 });
  }

  if (!body.imageDataUrl?.startsWith("data:image")) {
    return NextResponse.json({ error: "חסרה תמונה לחילוץ" }, { status: 400 });
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
