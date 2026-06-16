/**
 * One-time helper: create the central Sheet inside the company's Drive folder,
 * with the 8 headers + a "UsedTokens" tab.
 *
 * Run after google:auth (needs GOOGLE_REFRESH_TOKEN + GOOGLE_DRIVE_FOLDER_ID):
 *   npm run google:init
 *
 * Prints GOOGLE_SHEET_ID — paste it into .env.local.
 */
import { google } from "googleapis";

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN,
  GOOGLE_DRIVE_FOLDER_ID,
} = process.env;

const TAB = process.env.GOOGLE_SHEET_TAB || "Checks";
// Must match SHEET_HEADERS in lib/checks.ts (display only; mapping is by index).
const HEADERS = [
  "מספר צ'ק",
  "שם המקבל",
  "תאריך כתיבת הצ'ק",
  "סכום הצ'ק",
  "סטטוס צ'ק",
  "תאריך ושעת מסירה",
  "שם החותם המלא",
  "קישור לקובץ",
];

if (!GOOGLE_REFRESH_TOKEN) {
  console.error("✗ חסר GOOGLE_REFRESH_TOKEN — הרץ קודם: npm run google:auth");
  process.exit(1);
}
if (!GOOGLE_DRIVE_FOLDER_ID) {
  console.error("✗ חסר GOOGLE_DRIVE_FOLDER_ID ב-.env.local");
  process.exit(1);
}

const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
const drive = google.drive({ version: "v3", auth });
const sheets = google.sheets({ version: "v4", auth });

console.log("יוצר Sheet בתוך התיקייה...");
const file = await drive.files.create({
  requestBody: {
    name: "CheckTrack — מאגר צ'קים",
    mimeType: "application/vnd.google-apps.spreadsheet",
    parents: [GOOGLE_DRIVE_FOLDER_ID],
  },
  fields: "id",
  supportsAllDrives: true,
});
const spreadsheetId = file.data.id;

const meta = await sheets.spreadsheets.get({ spreadsheetId });
const firstSheetId = meta.data.sheets[0].properties.sheetId;

await sheets.spreadsheets.batchUpdate({
  spreadsheetId,
  requestBody: {
    requests: [
      { updateSheetProperties: { properties: { sheetId: firstSheetId, title: TAB }, fields: "title" } },
      { addSheet: { properties: { title: "UsedTokens" } } },
    ],
  },
});

await sheets.spreadsheets.values.update({
  spreadsheetId,
  range: `${TAB}!A1:H1`,
  valueInputOption: "RAW",
  requestBody: { values: [HEADERS] },
});

console.log("\n=== GOOGLE_SHEET_ID ===");
console.log(spreadsheetId);
console.log("=======================");
console.log("העתק את הערך הזה ל-GOOGLE_SHEET_ID ב-.env.local\n");
