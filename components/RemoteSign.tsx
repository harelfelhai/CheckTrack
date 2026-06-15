"use client";

import { useEffect, useState } from "react";
import SignaturePad from "@/components/SignaturePad";

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
    <div className="rounded-2xl bg-white p-8 text-center shadow-sm">{children}</div>
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

  if (state.phase === "loading") {
    return <Centered>טוען…</Centered>;
  }
  if (state.phase === "invalid") {
    return (
      <Centered>
        <p className="text-lg font-semibold text-red-600">הקישור אינו תקין</p>
        <p className="mt-2 text-sm text-slate-500">ייתכן שפג תוקפו או שהוזן באופן שגוי.</p>
      </Centered>
    );
  }
  if (state.phase === "used") {
    return (
      <Centered>
        <p className="text-lg font-semibold text-slate-700">הצ'ק כבר נחתם</p>
        <p className="mt-2 text-sm text-slate-500">קישור זה שימש כבר לחתימה ואינו פעיל עוד.</p>
      </Centered>
    );
  }
  if (state.phase === "done") {
    return (
      <Centered>
        <div className="text-4xl">✅</div>
        <p className="mt-3 text-lg font-semibold text-green-700">החתימה נקלטה בהצלחה, תודה!</p>
      </Centered>
    );
  }

  // phase === "ok"
  const { companyName, check } = state;
  return (
    <div className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
      <h1 className="text-xl font-bold text-brand-700">אישור קבלת צ'ק</h1>

      <div className="rounded-xl bg-brand-50 p-4 text-sm leading-relaxed text-slate-700">
        שלום, חברת <strong>{companyName}</strong> העבירה אליך את צ'ק מספר{" "}
        <strong>{check.checkNumber}</strong> על סך{" "}
        <strong>{new Intl.NumberFormat("he-IL").format(check.amount)} ש"ח</strong>, לזמן פירעון
        ב-<strong>{check.writtenDate}</strong>.
      </div>

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
          placeholder="לדוגמה: ישראל ישראלי"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <div>
        <span className="block text-sm font-medium text-slate-700">חתימה</span>
        <div className="mt-1">
          <SignaturePad onChange={setSignature} />
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? "שולח…" : "אישור ושליחה"}
      </button>
    </div>
  );
}
