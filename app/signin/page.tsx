import { redirect } from "next/navigation";
import { signIn, auth } from "@/auth";
import { isAuthEnabled } from "@/lib/auth-config";

// Sign-in screen (spec §5.ג). Server component with a Google sign-in action.
export default async function SignInPage() {
  // If auth is disabled (dev) or already signed in, skip straight to the app.
  if (!isAuthEnabled()) redirect("/");
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-brand-700">CheckTrack</h1>
        <p className="mt-2 text-sm text-slate-500">מערכת ניהול צ'קים יוצאים</p>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
          className="mt-8"
        >
          <button
            type="submit"
            className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700"
          >
            התחברות עם Google
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-400">
          הגישה מוגבלת למשתמשים מורשים בלבד.
        </p>
      </div>
    </main>
  );
}
