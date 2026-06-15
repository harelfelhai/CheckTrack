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
 * will later be auto-filled by OCR — before saving.
 */
export default function CheckForm({ values, onChange, ocrFilled, disabled }: Props) {
  function set<K extends keyof CheckFormValues>(key: K, value: string) {
    onChange({ ...values, [key]: value });
  }

  const fieldClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100";
  const labelClass = "block text-sm font-medium text-slate-700";

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass} htmlFor="recipientName">
          שם החברה / המקבל
        </label>
        <input
          id="recipientName"
          type="text"
          value={values.recipientName}
          onChange={(e) => set("recipientName", e.target.value)}
          placeholder="הזנה ידנית"
          disabled={disabled}
          className={`${fieldClass} mt-1`}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="checkNumber">
          מספר צ'ק {ocrFilled && <span className="text-xs text-brand-600">(חולץ — ניתן לתיקון)</span>}
        </label>
        <input
          id="checkNumber"
          type="text"
          inputMode="numeric"
          value={values.checkNumber}
          onChange={(e) => set("checkNumber", e.target.value)}
          disabled={disabled}
          className={`${fieldClass} mt-1`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="amount">
            סכום הצ'ק (₪)
          </label>
          <input
            id="amount"
            type="text"
            inputMode="numeric"
            value={values.amount}
            onChange={(e) => set("amount", e.target.value)}
            disabled={disabled}
            className={`${fieldClass} mt-1`}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="writtenDate">
            תאריך כתיבה
          </label>
          <input
            id="writtenDate"
            type="date"
            value={values.writtenDate}
            onChange={(e) => set("writtenDate", e.target.value)}
            disabled={disabled}
            className={`${fieldClass} mt-1`}
          />
        </div>
      </div>
    </div>
  );
}
