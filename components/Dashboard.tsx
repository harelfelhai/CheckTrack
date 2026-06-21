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

const dateOnly = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("he-IL", { dateStyle: "short" }) : "—";

export default function Dashboard({ isManager = false }: { isManager?: boolean }) {
  const [checks, setChecks] = useState<CheckRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("open");
  const [signTarget, setSignTarget] = useState<CheckRecord | null>(null);
  const [signError, setSignError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [share, setShare] = useState<ShareInfo | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [viewScan, setViewScan] = useState<string | null>(null); // check number
  const [scanError, setScanError] = useState(false);
  const [busyRow, setBusyRow] = useState<string | null>(null);

  // Archive (tab 2) filtering + sorting — spec §4, מסך 2, טאב 2.
  const [q, setQ] = useState("");
  const [wFrom, setWFrom] = useState("");
  const [wTo, setWTo] = useState("");
  const [dFrom, setDFrom] = useState("");
  const [dTo, setDTo] = useState("");
  const [amtMin, setAmtMin] = useState("");
  const [amtMax, setAmtMax] = useState("");
  const [sortKey, setSortKey] = useState<
    "createdAt" | "writtenDate" | "deliveredAt" | "amount" | "recipientName"
  >("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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

  function filterSortArchive(list: CheckRecord[]): CheckRecord[] {
    const term = q.trim().toLowerCase();
    const min = amtMin === "" ? null : Number(amtMin);
    const max = amtMax === "" ? null : Number(amtMax);
    const out = list.filter((c) => {
      if (term && !`${c.recipientName} ${c.checkNumber}`.toLowerCase().includes(term)) return false;
      if (wFrom && c.writtenDate < wFrom) return false;
      if (wTo && c.writtenDate > wTo) return false;
      const dDate = (c.deliveredAt ?? "").slice(0, 10);
      if (dFrom && (!dDate || dDate < dFrom)) return false;
      if (dTo && (!dDate || dDate > dTo)) return false;
      if (min != null && Number.isFinite(min) && c.amount < min) return false;
      if (max != null && Number.isFinite(max) && c.amount > max) return false;
      return true;
    });
    out.sort((a, b) => {
      const cmp =
        sortKey === "amount"
          ? a.amount - b.amount
          : sortKey === "recipientName"
            ? a.recipientName.localeCompare(b.recipientName, "he")
            : (a[sortKey] ?? "").toString().localeCompare((b[sortKey] ?? "").toString());
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }

  const rows = tab === "open" ? open : filterSortArchive(checks);

  function clearFilters() {
    setQ("");
    setWFrom("");
    setWTo("");
    setDFrom("");
    setDTo("");
    setAmtMin("");
    setAmtMax("");
  }

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

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

  async function doShare(check: CheckRecord, kind: "sign" | "pickup") {
    setShare(null);
    try {
      const res = await fetch(
        `/api/share/${encodeURIComponent(check.checkNumber)}${kind === "pickup" ? "?kind=pickup" : ""}`,
        { method: "POST" },
      );
      const data = (await res.json()) as ShareInfo & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "יצירת ההודעה נכשלה");
      setShare(data);
    } catch (e) {
      flash(e instanceof Error ? e.message : "יצירת ההודעה נכשלה");
    }
  }

  async function revert(check: CheckRecord) {
    if (!window.confirm(`להחזיר את צ'ק ${check.checkNumber} לסטטוס "לא נמסר"? פעולה זו תאפס את החתימה, תאריך המסירה וקובץ ה-PDF.`)) {
      return;
    }
    setBusyRow(check.checkNumber);
    try {
      const res = await fetch(`/api/checks/${encodeURIComponent(check.checkNumber)}/revert`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "ההחזרה נכשלה");
      await load();
      flash("הצ'ק הוחזר לסטטוס לא נמסר");
    } catch (e) {
      flash(e instanceof Error ? e.message : "ההחזרה נכשלה");
    } finally {
      setBusyRow(null);
    }
  }

  async function remove(check: CheckRecord) {
    if (!window.confirm(`למחוק לצמיתות את צ'ק ${check.checkNumber} (${check.recipientName})?`)) return;
    if (!window.confirm("המחיקה כוללת את השורה וגם את קבצי ה-PDF/הסריקה ב-Drive, ואינה הפיכה. להמשיך?")) {
      return;
    }
    setBusyRow(check.checkNumber);
    try {
      const res = await fetch(`/api/checks/${encodeURIComponent(check.checkNumber)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "המחיקה נכשלה");
      await load();
      flash("הצ'ק נמחק");
    } catch (e) {
      flash(e instanceof Error ? e.message : "המחיקה נכשלה");
    } finally {
      setBusyRow(null);
    }
  }

  const th = "whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold tracking-wide text-ink-soft";
  const td = "whitespace-nowrap px-3 py-3 text-ink";
  const fl = "block text-[0.7rem] font-semibold text-ink-soft";
  const fi = "mt-1 w-full rounded-lg border border-rule bg-paper px-2.5 py-2 text-sm text-ink outline-none focus:border-valid";
  const aBtn = "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition";
  const colCount = tab === "all" ? 10 : 7;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
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

      {tab === "all" && (
        <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl border border-rule bg-card p-4 sm:grid-cols-3 lg:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <label className={fl}>חיפוש (שם / מספר)</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="הקלד לסינון" className={fi} />
          </div>
          <div>
            <label className={fl}>תאריך פירעון — מ־</label>
            <input type="date" value={wFrom} onChange={(e) => setWFrom(e.target.value)} className={fi} />
          </div>
          <div>
            <label className={fl}>תאריך פירעון — עד</label>
            <input type="date" value={wTo} onChange={(e) => setWTo(e.target.value)} className={fi} />
          </div>
          <div>
            <label className={fl}>תאריך מסירה — מ־</label>
            <input type="date" value={dFrom} onChange={(e) => setDFrom(e.target.value)} className={fi} />
          </div>
          <div>
            <label className={fl}>תאריך מסירה — עד</label>
            <input type="date" value={dTo} onChange={(e) => setDTo(e.target.value)} className={fi} />
          </div>
          <div>
            <label className={fl}>סכום — מ־</label>
            <input type="number" inputMode="numeric" value={amtMin} onChange={(e) => setAmtMin(e.target.value)} className={fi} />
          </div>
          <div>
            <label className={fl}>סכום — עד</label>
            <input type="number" inputMode="numeric" value={amtMax} onChange={(e) => setAmtMax(e.target.value)} className={fi} />
          </div>
          <div>
            <label className={fl}>מיון לפי</label>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
              className={fi}
            >
              <option value="createdAt">תאריך רישום</option>
              <option value="writtenDate">תאריך פירעון</option>
              <option value="deliveredAt">תאריך מסירה</option>
              <option value="amount">סכום</option>
              <option value="recipientName">שם המוטב</option>
            </select>
          </div>
          <div className="col-span-2 flex items-end gap-2 sm:col-span-1">
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="flex-1 rounded-lg border border-rule bg-card px-3 py-2 text-sm font-medium text-ink hover:border-ink"
            >
              {sortDir === "asc" ? "↑ עולה" : "↓ יורד"}
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-rule bg-card px-3 py-2 text-sm font-medium text-ink-soft hover:text-ink"
            >
              נקה
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-rule bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-ink/80">
              <th className={th}>תאריך רישום</th>
              <th className={th}>מספר צ'ק</th>
              <th className={th}>שם המוטב</th>
              <th className={th}>סכום (כולל מע"מ)</th>
              <th className={th}>תאריך פירעון</th>
              <th className={th}>סטטוס</th>
              {tab === "all" && <th className={th}>מסירה</th>}
              {tab === "all" && <th className={th}>חותם</th>}
              {tab === "all" && <th className={th}>קובץ</th>}
              <th className={th}>פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {loading ? (
              <tr>
                <td className={`${td} text-ink-soft`} colSpan={colCount}>
                  טוען…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-3 py-10 text-center text-ink-soft" colSpan={colCount}>
                  אין צ'קים להצגה
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr key={c.checkNumber} className="transition hover:bg-paper">
                  <td className={td}>
                    <span className="tnum text-ink-soft">{dateOnly(c.createdAt)}</span>
                  </td>
                  <td className={td}>
                    <span className="tnum font-medium">#{c.checkNumber}</span>
                  </td>
                  <td className={`${td} font-medium`}>{c.recipientName}</td>
                  <td className={td}>
                    <span className="tnum font-semibold">{money(c.amount)}</span>
                  </td>
                  <td className={td}>
                    <span className="tnum text-ink-soft">{c.writtenDate}</span>
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
                  {tab === "all" && (
                    <td className={td}>
                      {c.fileUrl ? (
                        <a href={c.fileUrl} target="_blank" rel="noreferrer" className="font-semibold text-valid underline">
                          PDF
                        </a>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>
                  )}
                  <td className={td}>
                    <div className="flex flex-wrap gap-1.5">
                      {tab === "open" && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setSignError(null);
                              setSignTarget(c);
                            }}
                            className={`${aBtn} bg-valid text-paper hover:opacity-90`}
                          >
                            החתמה לצד
                          </button>
                          <button
                            type="button"
                            onClick={() => doShare(c, "sign")}
                            className={`${aBtn} border border-valid text-valid hover:bg-valid-soft`}
                          >
                            שתף שוב
                          </button>
                          <button
                            type="button"
                            onClick={() => doShare(c, "pickup")}
                            className={`${aBtn} border border-rule text-ink hover:border-ink`}
                          >
                            הודעת איסוף
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setScanError(false);
                          setViewScan(c.checkNumber);
                        }}
                        className={`${aBtn} border border-rule text-ink-soft hover:border-ink hover:text-ink`}
                      >
                        צפה בצילום
                      </button>
                      {isManager && tab === "all" && c.status === "delivered" && (
                        <button
                          type="button"
                          disabled={busyRow === c.checkNumber}
                          onClick={() => revert(c)}
                          className={`${aBtn} border border-ink text-ink hover:bg-paper disabled:opacity-50`}
                        >
                          החזר ללא נמסר
                        </button>
                      )}
                      {isManager && (
                        <button
                          type="button"
                          disabled={busyRow === c.checkNumber}
                          onClick={() => remove(c)}
                          className={`${aBtn} border border-stamp/40 text-stamp hover:bg-stamp-soft disabled:opacity-50`}
                        >
                          מחק
                        </button>
                      )}
                    </div>
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

      {viewScan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4"
          onClick={() => setViewScan(null)}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">צילום צ'ק #{viewScan}</p>
              <button type="button" onClick={() => setViewScan(null)} className="text-sm text-ink-soft hover:text-ink">
                סגירה ✕
              </button>
            </div>
            {scanError ? (
              <p className="py-10 text-center text-ink-soft">אין צילום שמור לצ'ק זה.</p>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/checks/${encodeURIComponent(viewScan)}/image`}
                alt={`צילום צ'ק ${viewScan}`}
                onError={() => setScanError(true)}
                className="w-full rounded-lg border border-rule bg-paper object-contain"
              />
            )}
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
