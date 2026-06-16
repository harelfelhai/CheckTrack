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
 * handles Hebrew RTL + font shaping natively). Shares the app's "Ledger & Stamp"
 * identity: serif display, mono financial data, status as an inked stamp.
 */
export function buildCheckHtml(opts: {
  record: CheckRecord;
  checkImageDataUrl?: string | null;
  signatureDataUrl?: string | null;
}): string {
  const { record, checkImageDataUrl, signatureDataUrl } = opts;
  const delivered = record.status === "delivered";

  const row = (label: string, value: string, mono = false) => `
    <tr>
      <th>${esc(label)}</th>
      <td class="${mono ? "mono" : ""}">${esc(value)}</td>
    </tr>`;

  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700&family=Frank+Ruhl+Libre:wght@700;900&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet" />
<style>
  :root {
    --ink: #13211c; --ink-soft: #51605a; --valid: #0f5132;
    --stamp: #a23b2b; --rule: #cdd6cf; --paper: #f6f8f4;
  }
  * { box-sizing: border-box; }
  body { font-family: "Assistant", Arial, sans-serif; color: var(--ink); margin: 0; padding: 32px; }
  .head { display: flex; align-items: flex-start; justify-content: space-between; }
  .eyebrow { font-family: "IBM Plex Mono", monospace; font-size: 11px; letter-spacing: 0.3em; color: var(--ink-soft); }
  h1 { font-family: "Frank Ruhl Libre", Georgia, serif; color: var(--ink); font-size: 26px; margin: 4px 0 0; font-weight: 900; }
  .sub { color: var(--ink-soft); font-size: 13px; margin-top: 2px; }

  .stamp {
    position: relative; display: inline-block; padding: 6px 16px;
    border: 2.5px solid currentColor; border-radius: 7px;
    font-family: "IBM Plex Mono", monospace; font-weight: 600; font-size: 15px;
    letter-spacing: 0.18em; transform: rotate(-5deg); opacity: 0.92;
  }
  .stamp::before { content: ""; position: absolute; inset: 3px; border: 1px solid currentColor; border-radius: 4px; opacity: 0.55; }
  .stamp.valid { color: var(--valid); }
  .stamp.pending { color: var(--stamp); }

  table { width: 100%; border-collapse: collapse; margin: 22px 0; }
  th, td { border: 1px solid var(--rule); padding: 9px 12px; text-align: right; font-size: 14px; }
  th { background: var(--paper); width: 35%; font-weight: 700; color: var(--ink-soft); }
  td.mono { font-family: "IBM Plex Mono", monospace; font-variant-numeric: tabular-nums; }

  .section-title { font-family: "Frank Ruhl Libre", serif; font-size: 15px; font-weight: 700; color: var(--ink); margin: 18px 0 8px; }
  .scan img { max-width: 100%; max-height: 360px; border: 1px solid var(--rule); border-radius: 6px; }
  .sign-box { border: 1px solid var(--rule); border-radius: 6px; padding: 12px; display: inline-block; min-width: 260px; }
  .sign-box img { max-height: 120px; }
  .sign-meta { font-family: "IBM Plex Mono", monospace; font-size: 12px; color: var(--ink-soft); margin-top: 6px; }
  .footer { margin-top: 28px; font-family: "IBM Plex Mono", monospace; font-size: 10px; color: var(--rule); border-top: 1px solid var(--rule); padding-top: 8px; letter-spacing: 0.05em; }
</style>
</head>
<body>
  <div class="head">
    <div>
      <div class="eyebrow">CHECKTRACK</div>
      <h1>אישור קבלת צ'ק</h1>
      <div class="sub">מסמך תיעוד צ'ק יוצא</div>
    </div>
    <div class="stamp ${delivered ? "valid" : "pending"}">${delivered ? "נמסר" : "לא נמסר"}</div>
  </div>

  <table>
    ${row("מספר צ'ק", record.checkNumber, true)}
    ${row("שם המקבל", record.recipientName)}
    ${row("תאריך כתיבת הצ'ק", record.writtenDate, true)}
    ${row("סכום הצ'ק", formatAmount(record.amount), true)}
    ${delivered ? row("שם החותם", record.signerName ?? "—") : ""}
    ${delivered ? row("תאריך ושעת מסירה", formatDateTime(record.deliveredAt), true) : ""}
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
