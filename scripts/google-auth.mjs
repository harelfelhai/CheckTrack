/**
 * One-time helper: obtain a Google refresh token for the company account.
 *
 * Run: npm run google:auth
 * (loads .env.local for GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).
 *
 * Opens the browser, you approve once, and the refresh token is printed.
 * Paste it into GOOGLE_REFRESH_TOKEN in .env.local.
 */
import http from "node:http";
import { exec } from "node:child_process";
import { google } from "googleapis";

const PORT = 53682;
const REDIRECT = `http://localhost:${PORT}/`;
const SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets",
  "openid",
  "email",
  "profile",
];

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error("✗ חסר GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET ב-.env.local");
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT);
const authUrl = oauth2.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: SCOPES,
  login_hint: process.env.GOOGLE_COMPANY_EMAIL,
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  const code = url.searchParams.get("code");
  const err = url.searchParams.get("error");
  if (err) {
    res.end("שגיאת הרשאה: " + err);
    console.error("✗ הרשאה נדחתה:", err);
    server.close();
    return;
  }
  if (!code) {
    res.statusCode = 204;
    res.end();
    return;
  }
  try {
    const { tokens } = await oauth2.getToken(code);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end("<h2 dir='rtl'>ההרשאה הושלמה ✓ אפשר לסגור את החלון ולחזור.</h2>");
    if (!tokens.refresh_token) {
      console.error(
        "\n✗ לא התקבל refresh token. ודא prompt=consent ושהאפליקציה לא 'זכרה' הרשאה קודמת (בטל גישה ב-myaccount.google.com/permissions ונסה שוב).",
      );
    } else {
      console.log("\n=== GOOGLE_REFRESH_TOKEN ===");
      console.log(tokens.refresh_token);
      console.log("============================");
      console.log("העתק את הערך הזה ל-GOOGLE_REFRESH_TOKEN ב-.env.local\n");
    }
  } catch (e) {
    res.end("שגיאה: " + e.message);
    console.error("✗", e.message);
  } finally {
    server.close();
  }
});

server.listen(PORT, () => {
  console.log("פותח דפדפן לאישור הרשאה...");
  console.log("אם הדפדפן לא נפתח, פתח ידנית את הקישור:\n" + authUrl + "\n");
  exec(`start "" "${authUrl}"`, () => {});
});
