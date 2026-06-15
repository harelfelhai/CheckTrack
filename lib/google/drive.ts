import { Readable } from "node:stream";
import { getDriveApi } from "@/lib/google/auth";

function folderId(): string {
  const id = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!id) throw new Error("חסר GOOGLE_DRIVE_FOLDER_ID");
  return id;
}

/** Uploads a PDF to the archive folder and returns its Drive link (column 8). */
export async function uploadPdf(
  fileName: string,
  bytes: Uint8Array,
): Promise<{ url: string }> {
  const drive = getDriveApi();
  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId()],
      mimeType: "application/pdf",
    },
    media: {
      mimeType: "application/pdf",
      body: Readable.from(Buffer.from(bytes)),
    },
    fields: "id, webViewLink",
    supportsAllDrives: true,
  });
  return {
    url:
      res.data.webViewLink ??
      `https://drive.google.com/file/d/${res.data.id}/view`,
  };
}
