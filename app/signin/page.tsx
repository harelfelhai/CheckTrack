import { redirect } from "next/navigation";
import { signIn, auth } from "@/auth";
import { isAuthEnabled } from "@/lib/auth-config";

// Render at request time, not at build. Otherwise the production build (which
// has no Google env vars) prerenders this as a permanent redirect to "/",
// breaking sign-in in deployment. Auth env is only present at runtime.
export const dynamic = "force-dynamic";

// Sign-in screen (spec §5.ג). Server component with a Google sign-in action.
export default async function SignInPage() {
  // If auth is disabled (dev) or already signed in, skip straight to the app.
  if (!isAuthEnabled()) redirect("/");
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <div className="rounded-xl border border-rule bg-card p-8 text-center">
        <p className="tnum text-xs tracking-[0.3em] text-ink-soft">CHECKTRACK</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">פנקס הצ'קים</h1>
        <p className="mt-1 text-sm text-ink-soft">מערכת ניהול צ'קים יוצאים</p>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
          className="mt-8"
        >
          <button
            type="submit"
            className="w-full rounded-lg border border-ink bg-ink px-4 py-3 font-semibold text-paper transition hover:border-valid hover:bg-valid"
          >
            התחברות עם Google
          </button>
        </form>

        <p className="mt-4 text-xs text-ink-soft">הגישה מוגבלת למשתמשים מורשים בלבד.</p>
      </div>
    </main>
  );
}
