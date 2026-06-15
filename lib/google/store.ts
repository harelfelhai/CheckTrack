/**
 * Google-backed CheckStore: Google Sheets as the central database + Google
 * Drive for archived PDFs (spec §3). Active when CHECKTRACK_DEV_MODE=false.
 *
 * Requires the env credentials in `.env.local.example`. Verified end-to-end
 * once Google credentials are configured.
 */

import type { CheckRecord } from "@/lib/types";
import type { CheckStore } from "@/lib/store";
import {
  listRows,
  appendRow,
  findRowNumber,
  updateRow,
  isJtiUsed,
  markJtiUsed,
} from "@/lib/google/sheets";
import { uploadPdf } from "@/lib/google/drive";

export class GoogleStore implements CheckStore {
  /** Ephemeral cache of captured scans (process lifetime) for PDF generation. */
  private imageCache = new Map<string, string>();

  async listChecks(): Promise<CheckRecord[]> {
    return listRows();
  }

  async getCheck(checkNumber: string): Promise<CheckRecord | null> {
    return (await listRows()).find((c) => c.checkNumber === checkNumber) ?? null;
  }

  async createCheck(record: CheckRecord): Promise<CheckRecord> {
    await appendRow(record);
    return record;
  }

  async updateCheck(
    checkNumber: string,
    patch: Partial<CheckRecord>,
  ): Promise<CheckRecord | null> {
    const rowNumber = await findRowNumber(checkNumber);
    if (!rowNumber) return null;
    const existing = (await listRows()).find((c) => c.checkNumber === checkNumber);
    if (!existing) return null;
    const updated: CheckRecord = { ...existing, ...patch };
    await updateRow(rowNumber, updated);
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
    this.imageCache.set(checkNumber, dataUrl);
  }

  async getImage(checkNumber: string): Promise<string | null> {
    return this.imageCache.get(checkNumber) ?? null;
  }

  async isTokenUsed(jti: string): Promise<boolean> {
    return isJtiUsed(jti);
  }

  async markTokenUsed(jti: string): Promise<void> {
    return markJtiUsed(jti);
  }
}
