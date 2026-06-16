/**
 * Auth gating config (spec §5.ג). Screens 1–2 require Google login + an email
 * allowlist. Account-agnostic: works for personal Gmail (allowlist) or a
 * Workspace domain (AUTH_ALLOWED_DOMAIN).
 *
 * Dev-bypass: when no Google OAuth credentials are configured, auth is
 * disabled so the app runs locally with zero setup.
 */

export function isAuthEnabled(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getAllowedEmails(): string[] {
  return (process.env.AUTH_ALLOWED_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function getAllowedDomain(): string | null {
  return process.env.AUTH_ALLOWED_DOMAIN?.trim().toLowerCase() || null;
}

/** Whether a signed-in email is permitted into screens 1–2. */
export function isAllowedEmail(email?: string | null): boolean {
  if (!email) return false;
  const e = email.toLowerCase();
  const allowed = getAllowedEmails();
  const domain = getAllowedDomain();
  // No restriction configured → allow any authenticated Google account.
  if (allowed.length === 0 && !domain) return true;
  if (allowed.includes(e)) return true;
  if (domain && e.endsWith(`@${domain}`)) return true;
  return false;
}

/** Path prefixes that require an authenticated, allowed user. The home page is
 *  gated too, so an unauthenticated visitor lands on the sign-in screen. */
export const PROTECTED_PAGES = ["/", "/capture", "/dashboard"];
export const PROTECTED_API = ["/api/checks", "/api/share"];

export function isProtectedPath(pathname: string): boolean {
  if (PROTECTED_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  return PROTECTED_API.some((p) => pathname.startsWith(p));
}
