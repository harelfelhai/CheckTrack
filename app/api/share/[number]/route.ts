import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { createSigningToken } from "@/lib/tokens";
import { buildSigningMessage, buildWhatsAppUrl, buildMailtoUrl } from "@/lib/share";

export const runtime = "nodejs";

/**
 * POST /api/share/[number] — generate a unique signing link for a check and
 * return the share payload (link + prefilled WhatsApp / email). Used by
 * "שלח קישור לחתימה מרחוק" (מסך 1) and "שתף שוב" (מסך 2).
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ number: string }> },
) {
  const { number } = await ctx.params;
  const checkNumber = decodeURIComponent(number);

  const store = await getStore();
  const check = await store.getCheck(checkNumber);
  if (!check) {
    return NextResponse.json({ error: "הצ'ק לא נמצא" }, { status: 404 });
  }
  if (check.status === "delivered") {
    return NextResponse.json({ error: "הצ'ק כבר נחתם ונמסר" }, { status: 409 });
  }

  const { token } = await createSigningToken(checkNumber);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
  const url = `${baseUrl}/sign/${token}`;

  const message = buildSigningMessage({
    companyName: process.env.COMPANY_NAME || "החברה שלנו",
    checkNumber: check.checkNumber,
    amount: check.amount,
    writtenDate: check.writtenDate,
    url,
  });

  return NextResponse.json({
    url,
    message,
    whatsappUrl: buildWhatsAppUrl(message),
    mailtoUrl: buildMailtoUrl(message),
  });
}
