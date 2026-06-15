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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-brand-700">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="signerName">
              שם החותם המלא
            </label>
            <input
              id="signerName"
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              disabled={submitting}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-700">חתימה</span>
            <div className="mt-1">
              <SignaturePad onChange={setSignature} />
            </div>
          </div>

          {(localError || error) && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {localError ?? error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={confirm}
              disabled={submitting}
              className="flex-1 rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? "מעבד…" : "אישור וסגירה"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
