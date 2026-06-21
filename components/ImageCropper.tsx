"use client";

import { useRef, useState } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

/**
 * Free-form crop modal (spec addition, פריט 1). Lets the user mark the cheque
 * region out of a photo (which may include a payment stub / background) before
 * OCR and saving. Touch-friendly. Returns a JPEG data URL of the selection.
 */
export default function ImageCropper({
  src,
  onConfirm,
  onCancel,
}: {
  src: string;
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completed, setCompleted] = useState<PixelCrop | null>(null);

  function apply() {
    const img = imgRef.current;
    if (!img || !completed || completed.width < 4 || completed.height < 4) {
      onConfirm(src); // no usable selection → keep the original image
      return;
    }
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(completed.width * scaleX);
    canvas.height = Math.round(completed.height * scaleY);
    const ctx = canvas.getContext("2d");
    if (!ctx) return onConfirm(src);
    ctx.drawImage(
      img,
      completed.x * scaleX,
      completed.y * scaleY,
      completed.width * scaleX,
      completed.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    onConfirm(canvas.toDataURL("image/jpeg", 0.92));
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-center bg-ink/80 p-4">
      <div className="mx-auto flex max-h-full w-full max-w-lg flex-col rounded-xl bg-card p-4">
        <p className="mb-2 text-sm font-semibold text-ink">סמן את אזור הצ'ק לחיתוך</p>
        <div className="flex-1 overflow-auto text-center">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompleted(c)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imgRef} src={src} alt="תמונה לחיתוך" className="max-h-[60vh] w-auto" />
          </ReactCrop>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={apply}
            className="flex-1 rounded-lg bg-valid px-4 py-2.5 font-semibold text-paper transition hover:opacity-90"
          >
            חתוך
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-rule bg-card px-4 py-2.5 font-medium text-ink-soft hover:text-ink"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
