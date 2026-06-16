"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SignatureDialog from "@/components/SignatureDialog";
import SharePanel, { type ShareInfo } from "@/components/SharePanel";
import StatusStamp from "@/components/StatusStamp";
import type { CheckRecord } from "@/lib/types";

type Tab = "open" | "all";

const money = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" }).format(n);

const dateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" }) : "—";

export default function Dashboard() {
  const [checks, setChecks] = useState<CheckRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("open");
  const [signTarget, setSignTarget] = useState<CheckRecord | null>(null);
  const [signError, setSignError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [share, setShare] = useState<ShareInfo | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checks", { cache: "no-store" });
      const data = (await res.json()) as { checks: CheckRecord[] };
      setChecks(data.checks ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const open = checks.filter((c) => c.status !== "delivered");
  const rows = tab === "open" ? open : checks;

  async function confirmSign(signerName: string, signatureDataUrl: string) {
    if (!signTarget) return;
    setSubmitting(true);
    setSignError(null);
    try {
      const res = await fetch(`/api/checks/${encodeURIComponent(signTarget.checkNumber)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName, signatureDataUrl }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "החתימה נכשלה");
      setSignTarget(null);
      await load();
    } catch (e) {
      setSignError(e instanceof Error ? e.message : "אירעה שגיאה");
    } finally {
      setSubmitting(false);
    }
  }

  async function shareAgain(check: CheckRecord) {
    setShare(null);
    try {
      const res = await fetch(`/api/share/${encodeURIComponent(check.checkNumber)}`, {
        method: "POST",
      });
      const data = (await res.json()) as ShareInfo & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "יצירת הקישור נכשלה");
      setShare(data);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "יצירת הקישור נכשלה");
      setTimeout(() => setToast(null), 4000);
    }
  }

  const th = "whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold tracking-wide text-ink-soft";
  const td = "whitespace-nowrap px-3 py-3 text-ink";

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-1 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink">פנקס הצ'קים</h1>
        <Link href="/" className="text-sm text-ink-soft hover:text-ink">
          חזרה →
        </Link>
      </header>
      <p className="mb-5 text-sm text-ink-soft">בקרה ומעקב אחר הצ'קים היוצאים</p>

      <div className="mb-4 flex gap-2">
        <TabButton active={tab === "open"} onClick={() => setTab("open")}>
          לא נמסרו ({open.length})
        </TabButton>
        <TabButton active={tab === "all"} onClick={() => setTab("all")}>
          ארכיון כל הצ'קים ({checks.length})
        </TabButton>
      </div>

      <div className="overflow-x-auto rounded-xl border border-rule bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-ink/80">
              <th className={th}>מספר צ'ק</th>
              <th className={th}>שם המקבל</th>
              <th className={th}>תאריך כתיבה</th>
              <th className={th}>סכום</th>
              <th className={th}>סטטוס</th>
              {tab === "all" && <th className={th}>מסירה</th>}
              {tab === "all" && <th className={th}>חותם</th>}
              <th className={th}>{tab === "open" ? "פעולות" : "קובץ"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {loading ? (
              <tr>
                <td className={`${td} text-ink-soft`} colSpan={8}>
                  טוען…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-3 py-10 text-center text-ink-soft" colSpan={8}>
                  אין צ'קים להצגה
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr key={c.checkNumber} className="transition hover:bg-paper">
                  <td className={td}>
                    <span className="tnum font-medium">#{c.checkNumber}</span>
                  </td>
                  <td className={`${td} font-medium`}>{c.recipientName}</td>
                  <td className={td}>
                    <span className="tnum text-ink-soft">{c.writtenDate}</span>
                  </td>
                  <td className={td}>
                    <span className="tnum font-semibold">{money(c.amount)}</span>
                  </td>
                  <td className={td}>
                    <StatusStamp delivered={c.status === "delivered"} size="sm" />
                  </td>
                  {tab === "all" && (
                    <td className={td}>
                      <span className="tnum text-ink-soft">{dateTime(c.deliveredAt)}</span>
                    </td>
                  )}
                  {tab === "all" && <td className={td}>{c.signerName ?? "—"}</td>}
                  <td className={td}>
                    {tab === "open" ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSignError(null);
                            setSignTarget(c);
                          }}
                          className="rounded-lg bg-valid px-3 py-1.5 text-xs font-semibold text-paper transition hover:opacity-90"
                        >
                          החתמה לצד
                        </button>
                        <button
                          type="button"
                          onClick={() => shareAgain(c)}
                          className="rounded-lg border border-valid px-3 py-1.5 text-xs font-semibold text-valid transition hover:bg-valid-soft"
                        >
                          שתף שוב
                        </button>
                      </div>
                    ) : c.fileUrl ? (
                      <a
                        href={c.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-valid underline"
                      >
                        PDF
                      </a>
                    ) : (
                      <span className="text-ink-soft">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {signTarget && (
        <SignatureDialog
          title="החתמה לצד"
          subtitle={`צ'ק ${signTarget.checkNumber} · ${signTarget.recipientName}`}
          submitting={submitting}
          error={signError}
          onCancel={() => setSignTarget(null)}
          onConfirm={confirmSign}
        />
      )}

      {share && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-md">
            <SharePanel info={share} onClose={() => setShare(null)} />
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-stamp px-4 py-2 text-sm text-paper shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-ink text-paper"
          : "border border-rule bg-card text-ink-soft hover:border-ink hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
