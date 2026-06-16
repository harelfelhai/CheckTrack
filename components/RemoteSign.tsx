"use client";

import { useEffect, useState } from "react";
import SignaturePad from "@/components/SignaturePad";
import StatusStamp from "@/components/StatusStamp";

interface CheckDetails {
  checkNumber: string;
  amount: number;
  writtenDate: string;
}

type LoadState =
  | { phase: "loading" }
  | { phase: "ok"; companyName: string; check: CheckDetails }
  | { phase: "invalid" }
  | { phase: "used" }
  | { phase: "done" };

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-rule bg-card p-8 text-center">{children}</div>
  );
}

export default function RemoteSign({ token }: { token: string }) {
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [signerName, setSignerName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/sign/${token}`)
      .then((r) => r.json())
      .then((data: { state: string; companyName?: string; check?: CheckDetails }) => {
        if (!active) return;
        if (data.state === "ok" && data.check) {
          setState({ phase: "ok", companyName: data.companyName ?? "", check: data.check });
        } else if (data.state === "used" || data.state === "signed") {
          setState({ phase: "used" });
        } else {
          setState({ phase: "invalid" });
        }
      })
      .catch(() => active && setState({ phase: "invalid" }));
    return () => {
      active = false;
    };
  }, [token]);

  async function submit() {
    if (!signerName.trim()) return setError("יש להזין את שמך המלא");
    if (!signature) return setError("יש לחתום במשטח החתימה");
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName: signerName.trim(), signatureDataUrl: signature }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "השליחה נכשלה");
      setState({ phase: "done" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "אירעה שגיאה");
      setSubmitting(false);
    }
  }

  if (state.phase === "loading") return <Centered>טוען…</Centered>;

  if (state.phase === "invalid") {
    return (
      <Centered>
        <p className="font-display text-xl font-bold text-stamp">הקישור אינו תקין</p>
        <p className="mt-2 text-sm text-ink-soft">ייתכן שפג תוקפו או שהוזן באופן שגוי.</p>
      </Centered>
    );
  }

  if (state.phase === "used") {
    return (
      <Centered>
        <p className="font-display text-xl font-bold text-ink">הצ'ק כבר נחתם</p>
        <p className="mt-2 text-sm text-ink-soft">קישור זה שימש כבר לחתימה ואינו פעיל עוד.</p>
      </Centered>
    );
  }

  if (state.phase === "done") {
    return (
      <Centered>
        <div className="flex justify-center py-2">
          <StatusStamp delivered />
        </div>
        <p className="mt-4 font-display text-xl font-bold text-valid">
          החתימה נקלטה בהצלחה, תודה!
        </p>
      </Centered>
    );
  }

  // phase === "ok"
  const { companyName, check } = state;
  return (
    <div className="space-y-5 rounded-xl border border-rule bg-card p-5">
      <header>
        <p className="tnum text-xs tracking-[0.3em] text-ink-soft">CHECKTRACK</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink">אישור קבלת צ'ק</h1>
      </header>

      <div className="rounded-lg border border-valid/20 bg-valid-soft p-4 text-sm leading-relaxed text-ink">
        שלום, חברת <strong>{companyName}</strong> העבירה אליך את צ'ק מספר{" "}
        <strong className="tnum">{check.checkNumber}</strong> על סך{" "}
        <strong className="tnum">
          {new Intl.NumberFormat("he-IL").format(check.amount)} ש״ח
        </strong>
        , לזמן פירעון ב־<strong className="tnum">{check.writtenDate}</strong>.
      </div>

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
          placeholder="לדוגמה: ישראל ישראלי"
          className="mt-1 w-full rounded-lg border border-rule bg-paper px-3 py-2.5 text-ink outline-none transition focus:border-valid focus:ring-2 focus:ring-valid-soft"
        />
      </div>

      <div>
        <span className="block text-xs font-semibold tracking-wide text-ink-soft">חתימה</span>
        <div className="mt-1">
          <SignaturePad onChange={setSignature} />
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-stamp/30 bg-stamp-soft px-3 py-2 text-sm text-stamp">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="w-full rounded-lg bg-valid px-4 py-3 font-semibold text-paper transition hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? "שולח…" : "אישור ושליחה"}
      </button>
    </div>
  );
}
