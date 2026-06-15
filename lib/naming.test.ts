import { describe, it, expect } from "vitest";
import { buildCheckFileName, formatDateForFileName } from "@/lib/naming";

describe("formatDateForFileName", () => {
  it("formats ISO date as YYYY.MM.DD", () => {
    expect(formatDateForFileName("2026-08-06")).toBe("2026.08.06");
  });
  it("returns sanitized input for non-ISO values", () => {
    expect(formatDateForFileName("ללא תאריך")).toBe("ללא תאריך");
  });
});

describe("buildCheckFileName", () => {
  it("matches the spec convention", () => {
    expect(
      buildCheckFileName({
        recipientName: "חברת מנופי המרכז",
        checkNumber: "10234",
        writtenDate: "2026-08-06",
      }),
    ).toBe("חברת מנופי המרכז - צק 10234 - 2026.08.06.pdf");
  });

  it("sanitizes illegal filesystem characters", () => {
    const name = buildCheckFileName({
      recipientName: 'א/ב:ג"ד',
      checkNumber: "5/5",
      writtenDate: "2026-01-02",
    });
    expect(name).not.toMatch(/[\\/:*?"<>|]/);
    expect(name.endsWith(".pdf")).toBe(true);
  });

  it("falls back for empty fields", () => {
    expect(
      buildCheckFileName({ recipientName: "", checkNumber: "", writtenDate: "2026-01-02" }),
    ).toBe("ללא שם - צק ללא מספר - 2026.01.02.pdf");
  });
});
