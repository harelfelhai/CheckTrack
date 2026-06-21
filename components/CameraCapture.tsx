"use client";

import { useRef, useState } from "react";

interface Props {
  imageDataUrl: string | null;
  onCapture: (dataUrl: string | null) => void;
  /** Opens the crop modal for the current image (פריט 1). */
  onRequestCrop?: () => void;
}

/**
 * Visual input (spec §4, מסך 1 שלב א'): two explicit choices — "Camera" opens
 * the device camera on mobile (`capture="environment"`), "Gallery" picks an
 * existing image (and is the natural path on desktop, which ignores `capture`).
 */
export default function CameraCapture({ imageDataUrl, onCapture, onRequestCrop }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset so re-selecting the same file fires onChange again.
    e.target.value = "";
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
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
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
          <div className="flex flex-wrap gap-2">
            {onRequestCrop && (
              <button
                type="button"
                onClick={onRequestCrop}
                className="flex-1 rounded-lg border border-rule bg-card px-4 py-2 text-sm font-medium text-ink hover:border-ink"
              >
                ✂️ חתוך
              </button>
            )}
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex-1 rounded-lg border border-rule bg-card px-4 py-2 text-sm font-medium text-ink hover:border-ink"
            >
              📷 צלם מחדש
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="flex-1 rounded-lg border border-rule bg-card px-4 py-2 text-sm font-medium text-ink hover:border-ink"
            >
              🖼️ מהגלריה
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
        <div className="flex flex-col items-stretch gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-rule bg-card text-ink-soft transition hover:border-valid hover:text-valid"
          >
            <span className="text-3xl">📷</span>
            <span className="font-medium">צלם את הצ'ק</span>
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="w-full rounded-lg border border-rule bg-card px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:border-ink hover:text-ink"
          >
            🖼️ בחירת תמונה מהגלריה
          </button>
        </div>
      )}

      {error && <p className="text-sm text-stamp">{error}</p>}
    </div>
  );
}
