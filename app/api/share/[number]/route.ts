import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { createSigningToken } from "@/lib/tokens";
import {
  buildSigningMessage,
  buildPickupMessage,
  buildWhatsAppUrl,
  buildMailtoUrl,
} from "@/lib/share";

export const runtime = "nodejs";

/**
 * POST /api/share/[number] — build a share payload (prefilled WhatsApp / email).
 * Two kinds (?kind=):
 *   - default ("sign"): a unique one-time signing link (מסך 1 / "שתף שוב").
 *   - "pickup": a plain "ready for pickup" notification, no link (מסך 2).
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ number: string }> },
) {
  const { number } = await ctx.params;
  const checkNumber = decodeURIComponent(number);
  const kind = req.nextUrl.searchParams.get("kind") === "pickup" ? "pickup" : "sign";

  const store = await getStore();
  const check = await store.getCheck(checkNumber);
  if (!check) {
    return NextResponse.json({ error: "הצ'ק לא נמצא" }, { status: 404 });
  }

  const companyName = process.env.COMPANY_NAME || "החברה שלנו";

  if (kind === "pickup") {
    const message = buildPickupMessage({
      companyName,
      checkNumber: check.checkNumber,
      amount: check.amount,
    });
    return NextResponse.json({
      url: null,
      message,
      whatsappUrl: buildWhatsAppUrl(message),
      mailtoUrl: buildMailtoUrl(message, "צ'ק מוכן לאיסוף"),
    });
  }

  if (check.status === "delivered") {
    return NextResponse.json({ error: "הצ'ק כבר נחתם ונמסר" }, { status: 409 });
  }

  const { token } = await createSigningToken(checkNumber);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
  const url = `${baseUrl}/sign/${token}`;

  const message = buildSigningMessage({
    companyName,
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
