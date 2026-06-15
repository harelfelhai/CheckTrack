import { auth, signOut } from "@/auth";

/** Shared chrome for the authenticated screens (1–2): shows the signed-in
 *  user + a sign-out action when auth is enabled. */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <>
      {session?.user && (
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2 text-sm">
            <span className="text-slate-500">{session.user.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/signin" });
              }}
            >
              <button type="submit" className="text-slate-500 hover:text-slate-700">
                התנתקות
              </button>
            </form>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
