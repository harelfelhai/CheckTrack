import { describe, it, expect } from "vitest";
import { recordToRow, rowToRecord, parseStatus, STATUS_LABELS } from "@/lib/checks";
import type { CheckRecord } from "@/lib/types";

const delivered: CheckRecord = {
  checkNumber: "10234",
  recipientName: "חברת מנופי המרכז",
  writtenDate: "2026-08-06",
  amount: 5400,
  status: "delivered",
  deliveredAt: "2026-06-14T17:55:19.149Z",
  signerName: "ישראל ישראלי",
  fileUrl: "https://drive/abc",
  createdAt: "2026-06-10T08:00:00.000Z",
};

describe("parseStatus", () => {
  it("maps Hebrew labels to status", () => {
    expect(parseStatus(STATUS_LABELS.delivered)).toBe("delivered");
    expect(parseStatus(STATUS_LABELS.not_delivered)).toBe("not_delivered");
    expect(parseStatus("משהו אחר")).toBe("not_delivered");
  });
});

describe("recordToRow / rowToRecord", () => {
  it("round-trips a delivered record", () => {
    const row = recordToRow(delivered);
    expect(row).toHaveLength(9);
    expect(row[4]).toBe(STATUS_LABELS.delivered);
    expect(rowToRecord(row)).toEqual(delivered);
  });

  it("handles a not-delivered record with empty optional fields", () => {
    const open: CheckRecord = {
      checkNumber: "1",
      recipientName: "ספק",
      writtenDate: "2026-01-01",
      amount: 100,
      status: "not_delivered",
      deliveredAt: null,
      signerName: null,
      fileUrl: null,
      createdAt: null,
    };
    expect(rowToRecord(recordToRow(open))).toEqual(open);
  });

  it("tolerates short rows", () => {
    const rec = rowToRecord(["77", "ספק"]);
    expect(rec.checkNumber).toBe("77");
    expect(rec.status).toBe("not_delivered");
    expect(rec.amount).toBe(0);
  });
});
