"use client";

import { useState } from "react";
import Link from "next/link";
import CameraCapture from "@/components/CameraCapture";
import CheckForm, { type CheckFormValues } from "@/components/CheckForm";
import SignatureDialog from "@/components/SignatureDialog";
import SharePanel, { type ShareInfo } from "@/components/SharePanel";
import { validateNewCheck } from "@/lib/validation";

type Feedback =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "success"; message: string; fileUrl?: string | null }
  | { kind: "error"; message: string };

const EMPTY: CheckFormValues = {
  checkNumber: "",
  recipientName: "",
  writtenDate: "",
  amount: "",
};

export default function CapturePage() {
  const [image, setImage] = useState<string | null>(null);
  const [values, setValues] = useState<CheckFormValues>(EMPTY);
  const [feedback, setFeedback] = useState<Feedback>({ kind: "idle" });
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [share, setShare] = useState<ShareInfo | null>(null);

  const busy = feedback.kind === "saving";

  function reset() {
    setValues(EMPTY);
    setImage(null);
  }

  /** Create the check row (status "not delivered"). Returns true on success. */
  /**
   * Create the check row. `allowExisting` controls 409 handling:
   * - false (plain save): a duplicate check number is an error.
   * - true (signing flows): an existing check is fine — proceed to sign it.
   */
  async function createCheck(allowExisting: boolean): Promise<void> {
    const res = await fetch("/api/checks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkNumber: values.checkNumber,
        recipientName: values.recipientName,
        writtenDate: values.writtenDate,
        amount: Number(values.amount),
        imageDataUrl: image ?? undefined,
      }),
    });
    if (res.status === 409) {
      if (allowExisting) return;
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? "צ'ק עם מספר זה כבר קיים במערכת");
    }
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "השמירה נכשלה");
  }

  async function saveNotDelivered() {
    const errors = validateNewCheck({ ...values, amount: Number(values.amount) });
    if (errors.length) return setFeedback({ kind: "error", message: errors.join(", ") });
    setFeedback({ kind: "saving" });
    try {
      await createCheck(false);
      setFeedback({ kind: "success", message: `הצ'ק נשמר כ"לא נמסר" בהצלחה` });
      reset();
    } catch (e) {
      setFeedback({ kind: "error", message: e instanceof Error ? e.message : "אירעה שגיאה" });
    }
  }

  function startFrontalSign() {
    const errors = validateNewCheck({ ...values, amount: Number(values.amount) });
    if (errors.length) return setFeedback({ kind: "error", message: errors.join(", ") });
    setSignError(null);
    setSigning(true);
  }

  async function confirmFrontalSign(signerName: string, signatureDataUrl: string) {
    setSignError(null);
    setFeedback({ kind: "saving" });
    try {
      await createCheck(true);
      const res = await fetch(`/api/checks/${encodeURIComponent(values.checkNumber)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName, signatureDataUrl, imageDataUrl: image ?? undefined }),
      });
      const data = (await res.json()) as { error?: string; check?: { fileUrl?: string | null } };
      if (!res.ok) throw new Error(data.error ?? "החתימה נכשלה");
      setSigning(false);
      setFeedback({
        kind: "success",
        message: `הצ'ק נחתם ונסגר כ"נמסר" בהצלחה`,
        fileUrl: data.check?.fileUrl,
      });
      reset();
    } catch (e) {
      setFeedback({ kind: "idle" });
      setSignError(e instanceof Error ? e.message : "אירעה שגיאה");
    }
  }

  async function sendRemoteLink() {
    const errors = validateNewCheck({ ...values, amount: Number(values.amount) });
    if (errors.length) return setFeedback({ kind: "error", message: errors.join(", ") });
    setShare(null);
    setFeedback({ kind: "saving" });
    try {
      await createCheck(true);
      const res = await fetch(`/api/share/${encodeURIComponent(values.checkNumber)}`, {
        method: "POST",
      });
      const data = (await res.json()) as ShareInfo & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "יצירת הקישור נכשלה");
      setShare(data);
      setFeedback({ kind: "idle" });
    } catch (e) {
      setFeedback({ kind: "error", message: e instanceof Error ? e.message : "אירעה שגיאה" });
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink">קליטת צ'ק חדש</h1>
        <Link href="/" className="text-sm text-ink-soft hover:text-ink">
          חזרה →
        </Link>
      </header>

      <section className="space-y-6 rounded-xl border border-rule bg-card p-5">
        <CameraCapture imageDataUrl={image} onCapture={setImage} />
        <CheckForm values={values} onChange={setValues} disabled={busy} />

        <div className="space-y-3 border-t border-rule pt-4">
          <p className="text-xs font-semibold tracking-wide text-ink-soft">בחירת פעולה</p>

          <button
            type="button"
            onClick={saveNotDelivered}
            disabled={busy}
            className="w-full rounded-lg border border-ink bg-ink px-4 py-3 font-semibold text-paper transition hover:bg-valid hover:border-valid disabled:opacity-60"
          >
            {busy ? "שומר…" : "שמור כלא נמסר"}
          </button>

          <button
            type="button"
            onClick={startFrontalSign}
            disabled={busy}
            className="w-full rounded-lg bg-valid px-4 py-3 font-semibold text-paper transition hover:opacity-90 disabled:opacity-60"
          >
            החתמה פרונטלית
          </button>

          <button
            type="button"
            onClick={sendRemoteLink}
            disabled={busy}
            className="w-full rounded-lg border border-valid px-4 py-3 font-semibold text-valid transition hover:bg-valid-soft disabled:opacity-60"
          >
            שלח קישור לחתימה מרחוק
          </button>
        </div>

        {share && <SharePanel info={share} onClose={() => setShare(null)} />}

        {feedback.kind === "success" && (
          <div className="rounded-lg border border-valid/30 bg-valid-soft px-4 py-3 text-sm text-valid">
            <p className="font-medium">{feedback.message}</p>
            {feedback.fileUrl && (
              <a
                href={feedback.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block font-semibold underline"
              >
                צפייה ב-PDF החתום ←
              </a>
            )}
          </div>
        )}
        {feedback.kind === "error" && (
          <p className="rounded-lg border border-stamp/30 bg-stamp-soft px-4 py-3 text-sm text-stamp">
            {feedback.message}
          </p>
        )}
      </section>

      {signing && (
        <SignatureDialog
          title="החתמה פרונטלית"
          subtitle={`צ'ק ${values.checkNumber} · ${values.recipientName}`}
          submitting={busy}
          error={signError}
          onCancel={() => {
            setSigning(false);
            setFeedback({ kind: "idle" });
          }}
          onConfirm={confirmFrontalSign}
        />
      )}
    </main>
  );
}
