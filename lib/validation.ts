import type { NewCheckInput } from "@/lib/types";

/** Validate the new-check payload from Screen 1. Returns Hebrew error messages. */
export function validateNewCheck(input: Partial<NewCheckInput>): string[] {
  const errors: string[] = [];
  if (!input.checkNumber?.toString().trim()) errors.push("מספר צ'ק חסר");
  if (!input.recipientName?.toString().trim()) errors.push("שם המוטב חסר");
  if (!input.writtenDate?.toString().trim()) errors.push("תאריך פירעון חסר");
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) errors.push("סכום הצ'ק לא תקין");
  return errors;
}

/** Validate a signature payload (frontal or remote). */
export function validateSignature(input: {
  signerName?: string;
  signatureDataUrl?: string;
}): string[] {
  const errors: string[] = [];
  if (!input.signerName?.toString().trim()) errors.push("שם החותם חסר");
  if (!input.signatureDataUrl?.toString().startsWith("data:image")) {
    errors.push("חתימה חסרה");
  }
  return errors;
}
