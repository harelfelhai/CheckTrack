/**
 * File naming convention for archived check PDFs (spec §3.ב).
 *
 * Template:  [שם המקבל] - צק [מספר הצ'ק] - [תאריך כתיבת הצ'ק].pdf
 * Example:   חברת מנופי המרכז - צק 10234 - 2026.08.06.pdf
 *
 * The written date is rendered as YYYY.MM.DD to keep archive ordering sane.
 */

/** Characters illegal in file names on common filesystems / Drive. */
const ILLEGAL_FILENAME_CHARS = /[\\/:*?"<>|]/g;

function sanitizeSegment(value: string): string {
  return value.replace(ILLEGAL_FILENAME_CHARS, " ").replace(/\s+/g, " ").trim();
}

/** Format an ISO date (YYYY-MM-DD) as YYYY.MM.DD; fall back to the raw value. */
export function formatDateForFileName(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate.trim());
  if (!match) return sanitizeSegment(isoDate);
  const [, year, month, day] = match;
  return `${year}.${month}.${day}`;
}

export function buildCheckFileName(input: {
  recipientName: string;
  checkNumber: string;
  writtenDate: string;
}): string {
  const recipient = sanitizeSegment(input.recipientName) || "ללא שם";
  const number = sanitizeSegment(input.checkNumber) || "ללא מספר";
  const date = formatDateForFileName(input.writtenDate);
  return `${recipient} - צק ${number} - ${date}.pdf`;
}
