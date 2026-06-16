export { auth as middleware } from "@/auth";

// Run the auth gate on protected screens + their APIs. Public routes
// (/sign/[token], /api/sign, /api/auth) are intentionally excluded.
export const config = {
  matcher: ["/", "/capture", "/dashboard", "/api/checks/:path*", "/api/share/:path*"],
};
