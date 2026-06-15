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
        }),
      ]
    : [],
  pages: { signIn: "/signin" },
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
