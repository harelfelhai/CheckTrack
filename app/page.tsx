import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-10 px-5 py-12">
      <header className="text-center">
        <p className="tnum text-xs tracking-[0.3em] text-ink-soft">CHECKTRACK</p>
        <h1 className="mt-3 font-display text-4xl font-black leading-tight text-ink">
          כל צ'ק יוצא,
          <br />
          <span className="text-valid">מתועד וחתום.</span>
        </h1>
        <p className="mt-4 text-ink-soft">
          קליטה, החתמה ומעקב — כדי ששום צ'ק לא יֵלך לאיבוד לפני שהופקד.
        </p>
        <div className="micr-rule mt-5">⑆ 0123456789 ⑆ 0123456789 ⑈</div>
      </header>

      <nav className="grid gap-4">
        <Link
          href="/capture"
          className="group rounded-xl border border-ink bg-ink px-6 py-5 text-center text-lg font-semibold text-paper transition hover:bg-valid hover:border-valid"
        >
          קליטת צ'ק חדש
        </Link>
        <Link
          href="/dashboard"
          className="rounded-xl border border-rule bg-card px-6 py-5 text-center text-lg font-semibold text-ink transition hover:border-ink"
        >
          פנקס הצ'קים — בקרה ומעקב
        </Link>
      </nav>

      <footer className="text-center text-xs text-ink-soft">גרסה 0.1 — בפיתוח</footer>
    </main>
  );
}
