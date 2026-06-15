import { getSheetsApi } from "@/lib/google/auth";
import { recordToRow, rowToRecord } from "@/lib/checks";
import type { CheckRecord } from "@/lib/types";

/** Central database operations on the Google Sheet (8 columns A:H). */

function spreadsheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("חסר GOOGLE_SHEET_ID");
  return id;
}
function tab(): string {
  return process.env.GOOGLE_SHEET_TAB || "Checks";
}
const TOKENS_TAB = "UsedTokens";

export async function listRows(): Promise<CheckRecord[]> {
  const sheets = getSheetsApi();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${tab()}!A2:H`,
  });
  const rows = res.data.values ?? [];
  return rows
    .filter((r) => (r[0] ?? "").toString().trim() !== "")
    .map((r) => rowToRecord(r as (string | null)[]));
}

export async function appendRow(record: CheckRecord): Promise<void> {
  const sheets = getSheetsApi();
  await sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetId(),
    range: `${tab()}!A:H`,
    valueInputOption: "RAW",
    requestBody: { values: [recordToRow(record)] },
  });
}

export async function findRowNumber(checkNumber: string): Promise<number | null> {
  const sheets = getSheetsApi();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${tab()}!A2:A`,
  });
  const col = res.data.values ?? [];
  const idx = col.findIndex((r) => (r[0] ?? "").toString().trim() === checkNumber);
  return idx === -1 ? null : idx + 2; // +2: header row + 1-based
}

export async function updateRow(rowNumber: number, record: CheckRecord): Promise<void> {
  const sheets = getSheetsApi();
  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId(),
    range: `${tab()}!A${rowNumber}:H${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [recordToRow(record)] },
  });
}

export async function isJtiUsed(jti: string): Promise<boolean> {
  const sheets = getSheetsApi();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId(),
      range: `${TOKENS_TAB}!A:A`,
    });
    return (res.data.values ?? []).some((r) => (r[0] ?? "") === jti);
  } catch {
    return false; // tab missing — status guard in applySignature still protects reuse
  }
}

export async function markJtiUsed(jti: string): Promise<void> {
  const sheets = getSheetsApi();
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId(),
      range: `${TOKENS_TAB}!A:A`,
      valueInputOption: "RAW",
      requestBody: { values: [[jti]] },
    });
  } catch {
    /* tab missing — see isJtiUsed note */
  }
}
