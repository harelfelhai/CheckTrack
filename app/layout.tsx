import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CheckTrack — ניהול צ'קים יוצאים",
  description: "מערכת מעקב, החתמה ותיעוד של צ'קים יוצאים",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The capture screen is the primary tool in the field — keep it mobile-first.
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
