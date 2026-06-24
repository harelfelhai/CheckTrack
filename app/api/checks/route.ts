import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { validateNewCheck, parseAmount } from "@/lib/validation";
import type { CheckRecord, NewCheckInput } from "@/lib/types";

export const runtime = "nodejs";

/** GET /api/checks — list all checks (for the dashboard). */
export async function GET() {
  const store = await getStore();
  const checks = await store.listChecks();
  return NextResponse.json({ checks });
}

/** POST /api/checks — create a new check (status "not delivered"). */
export async function POST(req: NextRequest) {
  let body: NewCheckInput;
  try {
    body = (await req.json()) as NewCheckInput;
  } catch {
    return NextResponse.json({ error: "גוף הבקשה אינו תקין" }, { status: 400 });
  }

  const errors = validateNewCheck(body);
  if (errors.length) {
    return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
  }

  const store = await getStore();
  const checkNumber = body.checkNumber.trim();

  const existing = await store.getCheck(checkNumber);
  if (existing) {
    return NextResponse.json(
      { error: `צ'ק עם מספר ${checkNumber} כבר קיים במערכת` },
      { status: 409 },
    );
  }

  const record: CheckRecord = {
    checkNumber,
    recipientName: body.recipientName.trim(),
    writtenDate: body.writtenDate,
    amount: parseAmount(body.amount),
    status: "not_delivered",
    deliveredAt: null,
    signerName: null,
    fileUrl: null,
    createdAt: new Date().toISOString(),
  };

  const created = await store.createCheck(record);
  if (body.imageDataUrl?.startsWith("data:image")) {
    await store.saveImage(checkNumber, body.imageDataUrl);
  }
  return NextResponse.json({ check: created }, { status: 201 });
}
