import type { CheckRecord } from "@/lib/types";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

function formatAmount(n: number): string {
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" }).format(n);
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });
}

/**
 * HTML template for the signed-check PDF (rendered to PDF by Puppeteer, which
 * handles Hebrew RTL + shaping natively). Images are passed as data URLs.
 */
export function buildCheckHtml(opts: {
  record: CheckRecord;
  checkImageDataUrl?: string | null;
  signatureDataUrl?: string | null;
}): string {
  const { record, checkImageDataUrl, signatureDataUrl } = opts;
  const delivered = record.status === "delivered";

  const row = (label: string, value: string) => `
    <tr>
      <th>${esc(label)}</th>
      <td>${esc(value)}</td>
    </tr>`;

  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", "Arial", sans-serif;
    color: #1e293b; margin: 0; padding: 32px;
  }
  h1 { color: #234e7e; font-size: 22px; margin: 0 0 4px; }
  .sub { color: #64748b; font-size: 13px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: right; font-size: 14px; }
  th { background: #f1f5f9; width: 35%; font-weight: 600; color: #334155; }
  .badge { display: inline-block; padding: 3px 12px; border-radius: 999px; font-size: 13px; font-weight: 600; }
  .delivered { background: #dcfce7; color: #166534; }
  .pending { background: #fef9c3; color: #854d0e; }
  .section-title { font-size: 14px; font-weight: 600; color: #334155; margin: 18px 0 8px; }
  .scan img { max-width: 100%; max-height: 360px; border: 1px solid #e2e8f0; border-radius: 8px; }
  .sign-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; display: inline-block; min-width: 260px; }
  .sign-box img { max-height: 120px; }
  .sign-meta { font-size: 13px; color: #475569; margin-top: 6px; }
  .footer { margin-top: 28px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
</style>
</head>
<body>
  <h1>CheckTrack — אישור קבלת צ'ק</h1>
  <div class="sub">מסמך תיעוד צ'ק יוצא</div>

  <table>
    ${row("מספר צ'ק", record.checkNumber)}
    ${row("שם המקבל", record.recipientName)}
    ${row("תאריך כתיבת הצ'ק", record.writtenDate)}
    ${row("סכום הצ'ק", formatAmount(record.amount))}
    <tr>
      <th>סטטוס</th>
      <td><span class="badge ${delivered ? "delivered" : "pending"}">${delivered ? "נמסר" : "לא נמסר"}</span></td>
    </tr>
    ${delivered ? row("שם החותם", record.signerName ?? "—") : ""}
    ${delivered ? row("תאריך ושעת מסירה", formatDateTime(record.deliveredAt)) : ""}
  </table>

  ${
    checkImageDataUrl
      ? `<div class="section-title">סריקת הצ'ק</div>
         <div class="scan"><img src="${checkImageDataUrl}" alt="סריקת הצ'ק" /></div>`
      : ""
  }

  ${
    signatureDataUrl
      ? `<div class="section-title">חתימת המקבל</div>
         <div class="sign-box">
           <img src="${signatureDataUrl}" alt="חתימה" />
           <div class="sign-meta">${esc(record.signerName ?? "")} · ${formatDateTime(record.deliveredAt)}</div>
         </div>`
      : ""
  }

  <div class="footer">הופק אוטומטית על ידי מערכת CheckTrack · ${formatDateTime(new Date().toISOString())}</div>
</body>
</html>`;
}
