/**
 * Google-backed CheckStore: Google Sheets as the central database + Google
 * Drive for archived PDFs and cheque scans (spec §3). Active when
 * CHECKTRACK_DEV_MODE=false.
 */

import type { CheckRecord } from "@/lib/types";
import type { CheckStore } from "@/lib/store";
import {
  listRows,
  appendRow,
  findRecordRow,
  updateRow,
  deleteRowByNumber,
  deleteImageMapping,
  isJtiUsed,
  markJtiUsed,
  getImageFileId,
  setImageFileId,
} from "@/lib/google/sheets";
import {
  uploadPdf,
  uploadImage,
  downloadImageDataUrl,
  deleteFile,
  fileIdFromUrl,
} from "@/lib/google/drive";

/** Filename-safe segment for the archived scan. */
function scanBaseName(checkNumber: string): string {
  const safe = checkNumber.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
  return `צק ${safe || "ללא מספר"} - סריקה`;
}

export class GoogleStore implements CheckStore {
  async listChecks(): Promise<CheckRecord[]> {
    return listRows();
  }

  async getCheck(checkNumber: string): Promise<CheckRecord | null> {
    return (await findRecordRow(checkNumber))?.record ?? null;
  }

  async createCheck(record: CheckRecord): Promise<CheckRecord> {
    await appendRow(record);
    return record;
  }

  async updateCheck(
    checkNumber: string,
    patch: Partial<CheckRecord>,
  ): Promise<CheckRecord | null> {
    // Single consistent read of (rowNumber, record); updateRow re-verifies the
    // row identity right before writing.
    const found = await findRecordRow(checkNumber);
    if (!found) return null;
    const updated: CheckRecord = { ...found.record, ...patch };
    await updateRow(found.rowNumber, updated);
    return updated;
  }

  async deleteCheck(checkNumber: string): Promise<boolean> {
    const found = await findRecordRow(checkNumber);
    if (!found) return false;
    // Snapshot the scan id before deleting, then purge the archived Drive files
    // (manager-confirmed "מחיקה גורפת"). The delete re-verifies the row.
    const scanFileId = await getImageFileId(checkNumber);
    await deleteRowByNumber(found.rowNumber, checkNumber);
    const pdfId = fileIdFromUrl(found.record.fileUrl);
    if (pdfId) await deleteFile(pdfId);
    if (scanFileId) await deleteFile(scanFileId);
    await deleteImageMapping(checkNumber);
    return true;
  }

  async revertCheck(checkNumber: string): Promise<CheckRecord | null> {
    const found = await findRecordRow(checkNumber);
    if (!found) return null;
    const orphanPdfId = fileIdFromUrl(found.record.fileUrl);
    const updated: CheckRecord = {
      ...found.record,
      status: "not_delivered",
      deliveredAt: null,
      signerName: null,
      fileUrl: null,
    };
    await updateRow(found.rowNumber, updated);
    // Purge the now-orphaned signed PDF (it embeds the scan + signature = PII).
    if (orphanPdfId) await deleteFile(orphanPdfId);
    return updated;
  }

  async savePdf(
    _checkNumber: string,
    fileName: string,
    bytes: Uint8Array,
  ): Promise<{ url: string }> {
    return uploadPdf(fileName, bytes);
  }

  async getPdf(): Promise<Uint8Array | null> {
    return null; // served directly from Drive via the file URL
  }

  async saveImage(checkNumber: string, dataUrl: string): Promise<void> {
    // Durably archive to Drive so any instance (incl. remote signing on a cold
    // instance) can embed the scan in the signed PDF. Best-effort — a Drive
    // hiccup must not block check creation — but it is logged, never silent.
    try {
      const { id } = await uploadImage(scanBaseName(checkNumber), dataUrl);
      await setImageFileId(checkNumber, id);
    } catch (e) {
      console.error(`saveImage: failed to archive scan for ${checkNumber}:`, e);
    }
  }

  async getImage(checkNumber: string): Promise<string | null> {
    // Always read from Drive (the durable source of truth) so a re-captured
    // scan is never masked by a stale process-level cache.
    const fileId = await getImageFileId(checkNumber);
    if (!fileId) return null;
    return downloadImageDataUrl(fileId);
  }

  async isTokenUsed(jti: string): Promise<boolean> {
    return isJtiUsed(jti);
  }

  async markTokenUsed(jti: string): Promise<void> {
    return markJtiUsed(jti);
  }
}
