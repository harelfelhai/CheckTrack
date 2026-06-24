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
const IMAGES_TAB = "Images";

/** Looks up the Drive file id of a check's archived scan (latest wins). */
export async function getImageFileId(checkNumber: string): Promise<string | null> {
  const sheets = getSheetsApi();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId(),
      range: `${IMAGES_TAB}!A:B`,
    });
    const rows = res.data.values ?? [];
    for (let i = rows.length - 1; i >= 0; i--) {
      if ((rows[i][0] ?? "").toString().trim() === checkNumber) {
        return (rows[i][1] ?? "").toString().trim() || null;
      }
    }
    return null;
  } catch {
    return null; // tab missing / unreadable — no archived scan
  }
}

/** Records the Drive file id of a check's archived scan. Creates the tab if
 *  it doesn't exist yet (older sheets). Best-effort — never throws. */
export async function setImageFileId(checkNumber: string, fileId: string): Promise<void> {
  const sheets = getSheetsApi();
  const append = () =>
    sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId(),
      range: `${IMAGES_TAB}!A:B`,
      valueInputOption: "RAW",
      requestBody: { values: [[checkNumber, fileId]] },
    });
  try {
    await append();
  } catch {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId(),
        requestBody: { requests: [{ addSheet: { properties: { title: IMAGES_TAB } } }] },
      });
      await append();
    } catch {
      /* give up — scan archival is best-effort */
    }
  }
}

export async function listRows(): Promise<CheckRecord[]> {
  const sheets = getSheetsApi();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${tab()}!A2:I`,
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
    range: `${tab()}!A:I`,
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

/** One consistent read returning both the 1-based row number and the parsed
 *  record. Avoids the TOCTOU of a separate findRowNumber + listRows pair. */
export async function findRecordRow(
  checkNumber: string,
): Promise<{ rowNumber: number; record: CheckRecord } | null> {
  const sheets = getSheetsApi();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${tab()}!A2:I`,
  });
  const rows = res.data.values ?? [];
  const idx = rows.findIndex((r) => (r[0] ?? "").toString().trim() === checkNumber);
  if (idx === -1) return null;
  return { rowNumber: idx + 2, record: rowToRecord(rows[idx] as (string | null)[]) };
}

/** Guards a positional write/delete: confirms the row still holds the expected
 *  check number, so a concurrent insert/delete that shifted rows can't make us
 *  clobber or delete the wrong cheque. Throws on mismatch. */
async function assertRowIs(rowNumber: number, checkNumber: string): Promise<void> {
  const sheets = getSheetsApi();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${tab()}!A${rowNumber}`,
  });
  const actual = (res.data.values?.[0]?.[0] ?? "").toString().trim();
  if (actual !== checkNumber) {
    throw new Error("עדכון בוטל: שורת היעד השתנתה בין הקריאה לכתיבה. נסו שוב.");
  }
}

export async function updateRow(rowNumber: number, record: CheckRecord): Promise<void> {
  const sheets = getSheetsApi();
  await assertRowIs(rowNumber, record.checkNumber);
  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId(),
    range: `${tab()}!A${rowNumber}:I${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [recordToRow(record)] },
  });
}

/** Numeric sheetId (gid) of a tab, needed for structural edits (row delete). */
async function getSheetId(title: string): Promise<number | null> {
  const sheets = getSheetsApi();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: spreadsheetId(),
    fields: "sheets.properties(sheetId,title)",
  });
  const found = (meta.data.sheets ?? []).find((s) => s.properties?.title === title);
  return found?.properties?.sheetId ?? null;
}

/** Permanently deletes a data row (1-based). When expectedCheckNumber is given,
 *  re-confirms the row still holds it right before deleting — so a concurrent
 *  row shift can't cause the wrong cheque to be deleted. */
export async function deleteRowByNumber(
  rowNumber: number,
  expectedCheckNumber?: string,
): Promise<void> {
  const sheets = getSheetsApi();
  if (expectedCheckNumber != null) await assertRowIs(rowNumber, expectedCheckNumber);
  const sheetId = await getSheetId(tab());
  if (sheetId == null) throw new Error("לא נמצא הגיליון למחיקה");
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetId(),
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowNumber - 1, // 0-based, inclusive
              endIndex: rowNumber, // exclusive
            },
          },
        },
      ],
    },
  });
}

/** Removes a check's row from the Images-mapping tab (best-effort). */
export async function deleteImageMapping(checkNumber: string): Promise<void> {
  const sheets = getSheetsApi();
  try {
    const sheetId = await getSheetId(IMAGES_TAB);
    if (sheetId == null) return;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId(),
      range: `${IMAGES_TAB}!A:B`,
    });
    const rows = res.data.values ?? [];
    // Delete from the bottom up so earlier indices stay valid.
    const requests = [];
    for (let i = rows.length - 1; i >= 0; i--) {
      if ((rows[i][0] ?? "").toString().trim() === checkNumber) {
        requests.push({
          deleteDimension: {
            range: { sheetId, dimension: "ROWS", startIndex: i, endIndex: i + 1 },
          },
        });
      }
    }
    if (requests.length) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId(),
        requestBody: { requests },
      });
    }
  } catch {
    /* best-effort */
  }
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
