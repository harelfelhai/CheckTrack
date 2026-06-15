import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-5 py-12">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-brand-700">CheckTrack</h1>
        <p className="mt-2 text-slate-600">מערכת מעקב, החתמה ותיעוד של צ'קים יוצאים</p>
      </header>

      <nav className="grid gap-4">
        <Link
          href="/capture"
          className="rounded-2xl bg-brand-600 px-6 py-5 text-center text-lg font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          קליטת צ'ק חדש
        </Link>
        <Link
          href="/dashboard"
          className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-center text-lg font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100"
        >
          דשבורד בקרה ומעקב
        </Link>
      </nav>

      <footer className="text-center text-xs text-slate-400">
        גרסה 0.1 — בפיתוח
      </footer>
    </main>
  );
}
