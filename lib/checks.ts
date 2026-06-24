/**
 * Domain logic for checks: status labels and mapping between a `CheckRecord`
 * and a Google Sheet row (the 8-column central database, spec §3.ג).
 */

import type { CheckRecord, CheckStatus } from "@/lib/types";

/** Hebrew status labels as stored in the Sheet (column 5). */
export const STATUS_LABELS: Record<CheckStatus, string> = {
  not_delivered: "לא נמסר",
  delivered: "נמסר",
};

/** Header row written to the central Sheet, in column order (A:I). */
export const SHEET_HEADERS = [
  "מספר צ'ק",
  "שם המוטב",
  "תאריך פירעון",
  'סכום הצ\'ק (כולל מע"מ)',
  "סטטוס צ'ק",
  "תאריך ושעת מסירה",
  "שם החותם המלא",
  "קישור לקובץ",
  "תאריך רישום",
] as const;

export function parseStatus(label: string): CheckStatus {
  return label.trim() === STATUS_LABELS.delivered ? "delivered" : "not_delivered";
}

/** Convert a record into a Sheet row (9 cells). The amount is emitted as a real
 *  number so the Sheet stores it numerically (enables SUM/sort); every other
 *  cell stays text so the check number keeps any leading zeros under RAW input. */
export function recordToRow(record: CheckRecord): (string | number)[] {
  return [
    record.checkNumber,
    record.recipientName,
    record.writtenDate,
    record.amount,
    STATUS_LABELS[record.status],
    record.deliveredAt ?? "",
    record.signerName ?? "",
    record.fileUrl ?? "",
    record.createdAt ?? "",
  ];
}

/** Convert a Sheet row back into a record. Tolerant of short/empty rows. */
export function rowToRecord(row: (string | number | null | undefined)[]): CheckRecord {
  const cell = (i: number): string => (row[i] == null ? "" : String(row[i])).trim();
  const amount = Number(cell(3).replace(/[^\d.-]/g, ""));
  return {
    checkNumber: cell(0),
    recipientName: cell(1),
    writtenDate: cell(2),
    amount: Number.isFinite(amount) ? amount : 0,
    status: parseStatus(cell(4)),
    deliveredAt: cell(5) || null,
    signerName: cell(6) || null,
    fileUrl: cell(7) || null,
    createdAt: cell(8) || null,
  };
}
