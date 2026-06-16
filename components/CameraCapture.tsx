"use client";

import { useRef, useState } from "react";

interface Props {
  imageDataUrl: string | null;
  onCapture: (dataUrl: string | null) => void;
}

/**
 * Visual input (spec §4, מסך 1 שלב א'): a "Camera/Scan" button that opens the
 * device camera on mobile (`capture="environment"`) and shows a preview.
 */
export default function CameraCapture({ imageDataUrl, onCapture }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => onCapture(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => setError("קריאת התמונה נכשלה");
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {imageDataUrl ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageDataUrl}
            alt="תצוגה מקדימה של הצ'ק"
            className="max-h-64 w-full rounded-lg border border-rule bg-card object-contain"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex-1 rounded-lg border border-rule bg-card px-4 py-2 text-sm font-medium text-ink hover:border-ink"
            >
              צילום מחדש
            </button>
            <button
              type="button"
              onClick={() => onCapture(null)}
              className="rounded-lg border border-stamp/40 bg-card px-4 py-2 text-sm font-medium text-stamp hover:bg-stamp-soft"
            >
              הסר
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-rule bg-card text-ink-soft transition hover:border-valid hover:text-valid"
        >
          <span className="text-3xl">▣</span>
          <span className="font-medium">צילום / סריקת הצ'ק</span>
        </button>
      )}

      {error && <p className="text-sm text-stamp">{error}</p>}
    </div>
  );
}
