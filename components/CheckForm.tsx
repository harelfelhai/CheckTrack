"use client";

export interface CheckFormValues {
  checkNumber: string;
  recipientName: string;
  writtenDate: string;
  amount: string;
}

interface Props {
  values: CheckFormValues;
  onChange: (values: CheckFormValues) => void;
  /** When true (Phase 6), number/amount/date were OCR-filled — still editable. */
  ocrFilled?: boolean;
  disabled?: boolean;
}

/**
 * Check details form (spec §4, מסך 1 שלב ב').
 * Core principle (§5.ב): EVERY field is fully editable — including those that
 * will later be auto-filled by OCR — before saving. Financial fields render in
 * tabular mono, like a checkbook line.
 */
export default function CheckForm({ values, onChange, ocrFilled, disabled }: Props) {
  function set<K extends keyof CheckFormValues>(key: K, value: string) {
    onChange({ ...values, [key]: value });
  }

  const field =
    "w-full rounded-lg border border-rule bg-card px-3 py-2.5 text-ink outline-none transition focus:border-valid focus:ring-2 focus:ring-valid-soft disabled:opacity-60";
  const label = "block text-xs font-semibold tracking-wide text-ink-soft";

  return (
    <div className="space-y-4">
      <div>
        <label className={label} htmlFor="recipientName">
          שם החברה / המקבל
        </label>
        <input
          id="recipientName"
          type="text"
          value={values.recipientName}
          onChange={(e) => set("recipientName", e.target.value)}
          placeholder="הזנה ידנית"
          disabled={disabled}
          className={`${field} mt-1`}
        />
      </div>

      <div>
        <label className={label} htmlFor="checkNumber">
          מספר צ'ק{" "}
          {ocrFilled && <span className="text-[0.7rem] text-valid">(חולץ — ניתן לתיקון)</span>}
        </label>
        <input
          id="checkNumber"
          type="text"
          inputMode="numeric"
          value={values.checkNumber}
          onChange={(e) => set("checkNumber", e.target.value)}
          disabled={disabled}
          className={`${field} tnum mt-1`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="amount">
            סכום הצ'ק (₪)
          </label>
          <input
            id="amount"
            type="text"
            inputMode="numeric"
            value={values.amount}
            onChange={(e) => set("amount", e.target.value)}
            disabled={disabled}
            className={`${field} tnum mt-1`}
          />
        </div>
        <div>
          <label className={label} htmlFor="writtenDate">
            תאריך כתיבה
          </label>
          <input
            id="writtenDate"
            type="date"
            value={values.writtenDate}
            onChange={(e) => set("writtenDate", e.target.value)}
            disabled={disabled}
            className={`${field} tnum mt-1`}
          />
        </div>
      </div>
    </div>
  );
}
