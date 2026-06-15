import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project (a stray lockfile exists in $HOME).
  outputFileTracingRoot: import.meta.dirname,
  // Server-only packages that should not be bundled for the browser.
  serverExternalPackages: ["googleapis", "puppeteer-core"],
};

export default nextConfig;
