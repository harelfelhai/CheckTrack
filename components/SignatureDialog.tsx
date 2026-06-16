"use client";

import { useState } from "react";
import SignaturePad from "@/components/SignaturePad";

interface Props {
  title: string;
  subtitle?: string;
  submitting?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (signerName: string, signatureDataUrl: string) => void;
}

/** Modal for capturing a signer name + signature (frontal & on-spot signing). */
export default function SignatureDialog({
  title,
  subtitle,
  submitting,
  error,
  onCancel,
  onConfirm,
}: Props) {
  const [signerName, setSignerName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  function confirm() {
    if (!signerName.trim()) return setLocalError("יש להזין את שם החותם");
    if (!signature) return setLocalError("יש לחתום במשטח החתימה");
    setLocalError(null);
    onConfirm(signerName.trim(), signature);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-xl border border-rule bg-card p-5 shadow-xl">
        <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold tracking-wide text-ink-soft" htmlFor="signerName">
              שם החותם המלא
            </label>
            <input
              id="signerName"
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              disabled={submitting}
              className="mt-1 w-full rounded-lg border border-rule bg-paper px-3 py-2.5 text-ink outline-none transition focus:border-valid focus:ring-2 focus:ring-valid-soft"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold tracking-wide text-ink-soft">חתימה</span>
            <div className="mt-1">
              <SignaturePad onChange={setSignature} />
            </div>
          </div>

          {(localError || error) && (
            <p className="rounded-lg border border-stamp/30 bg-stamp-soft px-3 py-2 text-sm text-stamp">
              {localError ?? error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={confirm}
              disabled={submitting}
              className="flex-1 rounded-lg bg-valid px-4 py-3 font-semibold text-paper transition hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "מעבד…" : "אישור וסגירה"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="rounded-lg border border-rule px-4 py-3 font-medium text-ink-soft transition hover:border-ink hover:text-ink disabled:opacity-60"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
