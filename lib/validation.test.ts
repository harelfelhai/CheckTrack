import { describe, it, expect } from "vitest";
import { validateNewCheck, validateSignature } from "@/lib/validation";

describe("validateNewCheck", () => {
  it("passes a valid input", () => {
    expect(
      validateNewCheck({
        checkNumber: "10234",
        recipientName: "ספק",
        writtenDate: "2026-08-06",
        amount: 5400,
      }),
    ).toEqual([]);
  });

  it("collects errors for missing/invalid fields", () => {
    const errors = validateNewCheck({ checkNumber: "", amount: -5 });
    expect(errors.length).toBe(4);
  });

  it("rejects zero amount", () => {
    const errors = validateNewCheck({
      checkNumber: "1",
      recipientName: "x",
      writtenDate: "2026-01-01",
      amount: 0,
    });
    expect(errors).toContain("סכום הצ'ק לא תקין");
  });
});

describe("validateSignature", () => {
  it("passes with name + image data url", () => {
    expect(
      validateSignature({ signerName: "דנה", signatureDataUrl: "data:image/png;base64,AAAA" }),
    ).toEqual([]);
  });

  it("fails without name or signature", () => {
    expect(validateSignature({}).length).toBe(2);
  });

  it("rejects a non-image signature", () => {
    expect(
      validateSignature({ signerName: "דנה", signatureDataUrl: "hello" }),
    ).toContain("חתימה חסרה");
  });
});
