"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SignatureDialog from "@/components/SignatureDialog";
import SharePanel, { type ShareInfo } from "@/components/SharePanel";
import { STATUS_LABELS } from "@/lib/checks";
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
    } catch {
      /* surfaced minimally for now */
    }
  }

  const th = "whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-600";
  const td = "whitespace-nowrap px-3 py-2 text-slate-700";

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-700">דשבורד בקרה ומעקב</h1>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
          ← חזרה
        </Link>
      </header>

      <div className="mb-4 flex gap-2">
        <TabButton active={tab === "open"} onClick={() => setTab("open")}>
          לא נמסרו ({open.length})
        </TabButton>
        <TabButton active={tab === "all"} onClick={() => setTab("all")}>
          ארכיון כל הצ'קים ({checks.length})
        </TabButton>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
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
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td className={td} colSpan={8}>
                  טוען…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-slate-400" colSpan={8}>
                  אין צ'קים להצגה
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr key={c.checkNumber}>
                  <td className={`${td} font-medium`}>{c.checkNumber}</td>
                  <td className={td}>{c.recipientName}</td>
                  <td className={td}>{c.writtenDate}</td>
                  <td className={td}>{money(c.amount)}</td>
                  <td className={td}>
                    <StatusBadge delivered={c.status === "delivered"} />
                  </td>
                  {tab === "all" && <td className={td}>{dateTime(c.deliveredAt)}</td>}
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
                          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                        >
                          החתמה לצד
                        </button>
                        <button
                          type="button"
                          onClick={() => shareAgain(c)}
                          className="rounded-lg border border-brand-600 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                        >
                          שתף שוב
                        </button>
                      </div>
                    ) : c.fileUrl ? (
                      <a
                        href={c.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-brand-600 underline"
                      >
                        PDF
                      </a>
                    ) : (
                      "—"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md">
            <SharePanel info={share} onClose={() => setShare(null)} />
          </div>
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
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
        active ? "bg-brand-600 text-white" : "bg-white text-slate-600 shadow-sm hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ delivered }: { delivered: boolean }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        delivered ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      {delivered ? STATUS_LABELS.delivered : STATUS_LABELS.not_delivered}
    </span>
  );
}
