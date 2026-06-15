import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

/**
 * GET /api/checks/[number]/pdf — serves the generated PDF in dev mode.
 * In production the file URL points directly to Google Drive instead.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ number: string }> },
) {
  const { number } = await ctx.params;
  const store = await getStore();
  const bytes = await store.getPdf(decodeURIComponent(number));
  if (!bytes) {
    return NextResponse.json({ error: "PDF לא נמצא" }, { status: 404 });
  }
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="check-${encodeURIComponent(number)}.pdf"`,
    },
  });
}
