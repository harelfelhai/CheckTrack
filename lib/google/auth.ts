import { google } from "googleapis";

/**
 * Builds an authenticated Google API client for the company account using an
 * OAuth2 refresh token (offline access). Server-side only. Account-agnostic:
 * works for both personal Gmail and Workspace.
 */
export function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "חסרים פרטי הרשאה ל-Google (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN).",
    );
  }
  const client = new google.auth.OAuth2(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

export function getSheetsApi() {
  return google.sheets({ version: "v4", auth: getOAuthClient() });
}

export function getDriveApi() {
  return google.drive({ version: "v3", auth: getOAuthClient() });
}
