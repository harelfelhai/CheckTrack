import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isAuthEnabled, isAllowedEmail, isProtectedPath } from "@/lib/auth-config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || "dev-insecure-secret-change-me",
  providers: isAuthEnabled()
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          // Always show the Google account chooser, so a blocked user can
          // retry with a different (authorized) account instead of being
          // silently re-logged into the same denied one.
          authorization: { params: { prompt: "select_account" } },
        }),
      ]
    : [],
  // Route auth errors (e.g. AccessDenied from the allowlist) back to our own
  // sign-in screen, which renders a friendly message — not NextAuth's default
  // error page.
  pages: { signIn: "/signin", error: "/signin" },
  callbacks: {
    // Enforce the email allowlist at sign-in (spec §5.ג).
    signIn({ profile }) {
      return isAllowedEmail(profile?.email);
    },
    // Gate protected routes (used by middleware). Dev-bypass when auth is off.
    authorized({ auth: session, request }) {
      if (!isAuthEnabled()) return true;
      if (!isProtectedPath(request.nextUrl.pathname)) return true;
      return !!session?.user;
    },
  },
});
