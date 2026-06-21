"use client";

import { useState } from "react";

export interface ShareInfo {
  /** Signing link, or null for a pickup notification (no link). */
  url: string | null;
  message: string;
  whatsappUrl: string;
  mailtoUrl: string;
}

/** Share the remote-signing link via the device's built-in share, WhatsApp,
 *  email, or copy (spec §4 מסך 1 שלב ג' / §5.א). */
export default function SharePanel({
  info,
  onClose,
}: {
  info: ShareInfo;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isPickup = !info.url;

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  async function nativeShare() {
    try {
      await navigator.share({ text: info.message });
    } catch {
      /* user cancelled — ignore */
    }
  }

  async function copyLink() {
    if (!info.url) return;
    try {
      await navigator.clipboard.writeText(info.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const btn = "block w-full rounded-lg px-4 py-3 text-center font-semibold transition";

  return (
    <div className="space-y-3 rounded-xl border border-valid/25 bg-valid-soft p-4">
      <p className="text-sm font-medium text-ink">
        {isPickup
          ? "שלח הודעה שהצ'ק מוכן לאיסוף:"
          : "הצ'ק נשמר כ״לא נמסר״. שלח את הקישור לחתימה מרחוק:"}
      </p>

      {canNativeShare && (
        <button type="button" onClick={nativeShare} className={`${btn} bg-ink text-paper hover:bg-valid`}>
          שיתוף דרך המכשיר
        </button>
      )}

      <a href={info.whatsappUrl} target="_blank" rel="noreferrer" className={`${btn} bg-[#25D366] text-white hover:opacity-90`}>
        שליחה בוואטסאפ
      </a>

      <a href={info.mailtoUrl} className={`${btn} border border-rule bg-card text-ink hover:border-ink`}>
        שליחה במייל
      </a>

      {!isPickup && (
        <button type="button" onClick={copyLink} className={`${btn} border border-rule bg-card text-ink hover:border-ink`}>
          {copied ? "הקישור הועתק ✓" : "העתקת קישור"}
        </button>
      )}

      <button type="button" onClick={onClose} className="w-full pt-1 text-sm text-ink-soft hover:text-ink">
        סגירה
      </button>
    </div>
  );
}
