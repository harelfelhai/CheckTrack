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

/**
 * Archives the captured check scan to the folder (spec §3.א). Durable storage
 * so the image survives across server instances and can be embedded into the
 * signed PDF later (incl. remote signing). `baseName` gets the right extension.
 */
export async function uploadImage(
  baseName: string,
  dataUrl: string,
): Promise<{ id: string }> {
  const m = /^data:(image\/([\w.+-]+));base64,(.*)$/s.exec(dataUrl);
  if (!m) throw new Error("תמונה לא תקינה");
  const mimeType = m[1];
  const ext = m[2] === "jpeg" ? "jpg" : m[2].replace(/[^\w]/g, "") || "img";
  const bytes = Buffer.from(m[3], "base64");
  const drive = getDriveApi();
  const res = await drive.files.create({
    requestBody: { name: `${baseName}.${ext}`, parents: [folderId()], mimeType },
    media: { mimeType, body: Readable.from(bytes) },
    fields: "id",
    supportsAllDrives: true,
  });
  return { id: res.data.id! };
}

/** Extracts a Drive file id from a webViewLink (…/file/d/<id>/view) or
 *  /uc?id=<id> style URL. Returns null if not parseable. */
export function fileIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/d\/([\w-]+)/) || url.match(/[?&]id=([\w-]+)/);
  return m?.[1] ?? null;
}

/** Permanently deletes a Drive file. Best-effort — never throws. */
export async function deleteFile(fileId: string): Promise<void> {
  const drive = getDriveApi();
  try {
    await drive.files.delete({ fileId, supportsAllDrives: true });
  } catch {
    /* file already gone / no permission — ignore */
  }
}

/** Downloads an archived image by file id and returns it as a data URL. */
export async function downloadImageDataUrl(fileId: string): Promise<string | null> {
  const drive = getDriveApi();
  try {
    const meta = await drive.files.get({
      fileId,
      fields: "mimeType",
      supportsAllDrives: true,
    });
    const res = await drive.files.get(
      { fileId, alt: "media", supportsAllDrives: true },
      { responseType: "arraybuffer" },
    );
    const mimeType = meta.data.mimeType || "image/jpeg";
    const base64 = Buffer.from(res.data as ArrayBuffer).toString("base64");
    return `data:${mimeType};base64,${base64}`;
  } catch {
    return null;
  }
}
