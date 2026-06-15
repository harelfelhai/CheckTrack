"use client";

import { useState } from "react";

export interface ShareInfo {
  url: string;
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

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  async function nativeShare() {
    try {
      await navigator.share({ text: info.message });
    } catch {
      /* user cancelled — ignore */
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(info.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const btn =
    "block w-full rounded-xl px-4 py-3 text-center font-semibold transition";

  return (
    <div className="space-y-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
      <p className="text-sm font-medium text-slate-700">
        הצ'ק נשמר כ"לא נמסר". שלח את הקישור לחתימה מרחוק:
      </p>

      {canNativeShare && (
        <button type="button" onClick={nativeShare} className={`${btn} bg-brand-600 text-white hover:bg-brand-700`}>
          שיתוף דרך המכשיר
        </button>
      )}

      <a href={info.whatsappUrl} target="_blank" rel="noreferrer" className={`${btn} bg-[#25D366] text-white hover:opacity-90`}>
        שליחה בוואטסאפ
      </a>

      <a href={info.mailtoUrl} className={`${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>
        שליחה במייל
      </a>

      <button type="button" onClick={copyLink} className={`${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>
        {copied ? "הקישור הועתק ✓" : "העתקת קישור"}
      </button>

      <button type="button" onClick={onClose} className="w-full pt-1 text-sm text-slate-500 hover:text-slate-700">
        סגירה
      </button>
    </div>
  );
}
