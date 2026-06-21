/**
 * Domain types for CheckTrack.
 *
 * The central database is a Google Sheet with 8 columns (see spec §3.ג).
 * `CheckRecord` is the in-app representation; `lib/checks.ts` maps it to/from
 * a Sheet row.
 */

export type CheckStatus = "not_delivered" | "delivered";

export interface CheckRecord {
  /** עמודה 1 — מספר צ'ק. Unique key. */
  checkNumber: string;
  /** עמודה 2 — שם המקבל (חברה/ספק). */
  recipientName: string;
  /** עמודה 3 — תאריך כתיבת הצ'ק. ISO date string (YYYY-MM-DD). */
  writtenDate: string;
  /** עמודה 4 — סכום הצ'ק (₪). */
  amount: number;
  /** עמודה 5 — סטטוס צ'ק. */
  status: CheckStatus;
  /** עמודה 6 — תאריך ושעת מסירה. ISO datetime, set when signed. */
  deliveredAt: string | null;
  /** עמודה 7 — שם החותם המלא. */
  signerName: string | null;
  /** עמודה 8 — קישור לקובץ ה-PDF ב-Drive. */
  fileUrl: string | null;
  /** עמודה 9 — תאריך רישום הצ'ק במערכת (ISO datetime). נקבע אוטומטית ביצירה.
   *  שורות ישנות שנוצרו לפני התוספת יחזירו null. */
  createdAt: string | null;
}

/** Payload sent from Screen 1 to create a new check (before any signature). */
export interface NewCheckInput {
  checkNumber: string;
  recipientName: string;
  writtenDate: string;
  amount: number;
  /** Base64 data URL of the captured check image (optional in dev). */
  imageDataUrl?: string;
}

/** Payload for applying a signature (frontal or remote). */
export interface SignatureInput {
  signerName: string;
  /** Base64 data URL (PNG) of the captured signature. */
  signatureDataUrl: string;
}
