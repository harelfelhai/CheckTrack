/**
 * Read-only connectivity check: confirms the refresh token, Sheets access,
 * and Drive folder access all work. No writes, no cost.
 *   npm run google:verify
 */
import { google } from "googleapis";

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

console.log("בודק חיבור ל-Google...\n");

const folder = await drive.files.get({
  fileId: GOOGLE_DRIVE_FOLDER_ID,
  fields: "id,name",
  supportsAllDrives: true,
});
console.log(`✓ תיקיית Drive: "${folder.data.name}" (${folder.data.id})`);

const headers = await sheets.spreadsheets.values.get({
  spreadsheetId: GOOGLE_SHEET_ID,
  range: `${TAB}!A1:H1`,
});
console.log(`✓ Sheet "${TAB}" — כותרות:`);
console.log("  " + (headers.data.values?.[0] || []).join(" | "));

console.log("\n✓ החיבור תקין. מוכן לבדיקת E2E מלאה.");
