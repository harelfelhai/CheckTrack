/**
 * Storage abstraction for checks.
 *
 * The app talks to a `CheckStore`, never directly to Google. In dev mode
 * (`CHECKTRACK_DEV_MODE !== "false"`) an in-memory store is used so the app
 * runs with zero Google setup. In production, the Google-backed store
 * (Sheets + Drive) is selected — wired up in Phase 1.
 */

import type { CheckRecord } from "@/lib/types";

export interface CheckStore {
  listChecks(): Promise<CheckRecord[]>;
  getCheck(checkNumber: string): Promise<CheckRecord | null>;
  createCheck(record: CheckRecord): Promise<CheckRecord>;
  updateCheck(
    checkNumber: string,
    patch: Partial<CheckRecord>,
  ): Promise<CheckRecord | null>;
  /** Permanently removes a check (and, in prod, its archived Drive files).
   *  Manager-only action (spec addition). Returns false if not found. */
  deleteCheck(checkNumber: string): Promise<boolean>;
  /** Manager-only: return a delivered check to "not delivered" with a full reset
   *  (clears signer/deliveredAt/fileUrl) and, in prod, deletes the now-orphaned
   *  signed PDF from Drive. Returns null if not found. */
  revertCheck(checkNumber: string): Promise<CheckRecord | null>;

  /** Persist the generated PDF; returns the URL stored in column 8. */
  savePdf(
    checkNumber: string,
    fileName: string,
    bytes: Uint8Array,
  ): Promise<{ url: string }>;
  /** Read PDF bytes (dev serving). In prod, the file is served from Drive. */
  getPdf(checkNumber: string): Promise<Uint8Array | null>;

  /** Persist the captured scan image (data URL) for later signing. */
  saveImage(checkNumber: string, dataUrl: string): Promise<void>;
  getImage(checkNumber: string): Promise<string | null>;

  /** One-time token enforcement for remote signing (spec §5.א). */
  isTokenUsed(jti: string): Promise<boolean>;
  markTokenUsed(jti: string): Promise<void>;
}

export function isDevMode(): boolean {
  return process.env.CHECKTRACK_DEV_MODE !== "false";
}

let cached: CheckStore | null = null;

export async function getStore(): Promise<CheckStore> {
  if (cached) return cached;
  if (isDevMode()) {
    const { MemoryStore } = await import("@/lib/data/memory");
    cached = new MemoryStore();
  } else {
    const { GoogleStore } = await import("@/lib/google/store");
    cached = new GoogleStore();
  }
  return cached;
}
