import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isAuthEnabled, isAllowedEmail, isProtectedPath } from "@/lib/auth-config";

// The session cookie is signed/encrypted with this. A missing secret in
// production would let anyone forge a session cookie and bypass the allowlist,
// so refuse the insecure fallback there.
function authSecret(): string {
  const value = process.env.AUTH_SECRET;
  if (value) return value;
  // Allow the insecure fallback in dev and during `next build` (no requests are
  // served then). Refuse it only at production RUNTIME, where a missing secret
  // would make session cookies forgeable.
  const isBuild = process.env.NEXT_PHASE === "phase-production-build";
  if (process.env.NODE_ENV === "production" && !isBuild) {
    throw new Error("AUTH_SECRET is required in production");
  }
  return "dev-insecure-secret-change-me";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: authSecret(),
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
    // Re-validate the email against the *current* allowlist on every request, so
    // removing someone from AUTH_ALLOWED_EMAILS takes effect immediately and not
    // only when their session is next created.
    authorized({ auth: session, request }) {
      if (!isAuthEnabled()) return true;
      if (!isProtectedPath(request.nextUrl.pathname)) return true;
      return isAllowedEmail(session?.user?.email);
    },
  },
});
