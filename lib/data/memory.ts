/**
 * In-memory CheckStore for development. Data is kept on `globalThis` so it
 * survives Next.js dev module reloads within a single server process.
 * Not for production — process restart clears everything.
 */

import type { CheckRecord } from "@/lib/types";
import type { CheckStore } from "@/lib/store";

interface GlobalWithStore {
  __checktrackChecks?: Map<string, CheckRecord>;
  __checktrackPdfs?: Map<string, Uint8Array>;
  __checktrackImages?: Map<string, string>;
  __checktrackUsedTokens?: Set<string>;
}

function g(): GlobalWithStore {
  return globalThis as unknown as GlobalWithStore;
}
function checks(): Map<string, CheckRecord> {
  return (g().__checktrackChecks ??= new Map());
}
function pdfs(): Map<string, Uint8Array> {
  return (g().__checktrackPdfs ??= new Map());
}
function images(): Map<string, string> {
  return (g().__checktrackImages ??= new Map());
}
function usedTokens(): Set<string> {
  return (g().__checktrackUsedTokens ??= new Set());
}

export class MemoryStore implements CheckStore {
  async listChecks(): Promise<CheckRecord[]> {
    return Array.from(checks().values());
  }

  async getCheck(checkNumber: string): Promise<CheckRecord | null> {
    return checks().get(checkNumber) ?? null;
  }

  async createCheck(record: CheckRecord): Promise<CheckRecord> {
    checks().set(record.checkNumber, record);
    return record;
  }

  async updateCheck(
    checkNumber: string,
    patch: Partial<CheckRecord>,
  ): Promise<CheckRecord | null> {
    const existing = checks().get(checkNumber);
    if (!existing) return null;
    const updated: CheckRecord = { ...existing, ...patch };
    checks().set(checkNumber, updated);
    return updated;
  }

  async savePdf(
    checkNumber: string,
    _fileName: string,
    bytes: Uint8Array,
  ): Promise<{ url: string }> {
    pdfs().set(checkNumber, bytes);
    return { url: `/api/checks/${encodeURIComponent(checkNumber)}/pdf` };
  }

  async getPdf(checkNumber: string): Promise<Uint8Array | null> {
    return pdfs().get(checkNumber) ?? null;
  }

  async saveImage(checkNumber: string, dataUrl: string): Promise<void> {
    images().set(checkNumber, dataUrl);
  }

  async getImage(checkNumber: string): Promise<string | null> {
    return images().get(checkNumber) ?? null;
  }

  async isTokenUsed(jti: string): Promise<boolean> {
    return usedTokens().has(jti);
  }

  async markTokenUsed(jti: string): Promise<void> {
    usedTokens().add(jti);
  }
}
