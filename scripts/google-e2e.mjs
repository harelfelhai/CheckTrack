/**
 * Live write E2E (self-cleaning): proves the production credentials can WRITE
 * to both the Sheet and the Drive folder, then removes everything it created.
 * Uses the refresh token directly (no dev server / no auth session needed).
 *   npm run google:e2e
 */
import { google } from "googleapis";
import { Readable } from "node:stream";

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN,
  GOOGLE_SHEET_ID,
  GOOGLE_DRIVE_FOLDER_ID,
} = process.env;
const TAB = process.env.GOOGLE_SHEET_TAB || "Checks";

const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
const drive = google.drive({ version: "v3", auth });
const sheets = google.sheets({ version: "v4", auth });

const testNumber = `E2E-${Date.now()}`;
const fileName = `E2E test - ${testNumber}.pdf`;
const ok = (m) => console.log(`✓ ${m}`);

// Minimal placeholder PDF bytes (Drive stores raw bytes by mimeType).
const pdfBytes = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
  "latin1",
);

let uploadedFileId = null;
let appendedRow = null;

try {
  // 1) WRITE row to Sheet
  await sheets.spreadsheets.values.append({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: `${TAB}!A:H`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[testNumber, "בדיקת E2E", "2026-06-16", "1", "לא נמסר", "", "", ""]],
    },
  });
  ok(`נכתבה שורת בדיקה ל-Sheet (מספר ${testNumber})`);

  // 2) READ BACK to confirm
  const read = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: `${TAB}!A:H`,
  });
  const rows = read.data.values || [];
  appendedRow = rows.findIndex((r) => r[0] === testNumber);
  if (appendedRow === -1) throw new Error("השורה לא נמצאה בקריאה חוזרת");
  ok(`השורה אומתה בקריאה חוזרת (שורה ${appendedRow + 1})`);

  // 3) UPLOAD PDF to Drive
  const up = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [GOOGLE_DRIVE_FOLDER_ID],
      mimeType: "application/pdf",
    },
    media: { mimeType: "application/pdf", body: Readable.from(pdfBytes) },
    fields: "id, webViewLink",
    supportsAllDrives: true,
  });
  uploadedFileId = up.data.id;
  ok(`הועלה PDF בדיקה ל-Drive: ${up.data.webViewLink}`);
} finally {
  // 4) CLEANUP — delete the test PDF + remove the test row
  if (uploadedFileId) {
    await drive.files.delete({ fileId: uploadedFileId, supportsAllDrives: true });
    ok("נמחק PDF הבדיקה מ-Drive");
  }
  if (appendedRow !== null && appendedRow >= 0) {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: GOOGLE_SHEET_ID });
    const sheetId = meta.data.sheets.find(
      (s) => s.properties.title === TAB,
    ).properties.sheetId;
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: GOOGLE_SHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: appendedRow,
                endIndex: appendedRow + 1,
              },
            },
          },
        ],
      },
    });
    ok("נמחקה שורת הבדיקה מ-Sheet");
  }
}

console.log("\n✓ E2E עבר: קריאה + כתיבה ל-Sheet ול-Drive עובדות בפרודקשן. נוקה הכול.");
