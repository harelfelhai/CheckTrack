"use client";

import { useEffect, useRef } from "react";
import SignaturePadLib from "signature_pad";

interface Props {
  /** Called with the signature PNG data URL, or null when cleared/empty. */
  onChange: (dataUrl: string | null) => void;
}

/**
 * Digital signature surface (spec §4, מסך 3 / "משטח חתימה דיגיטלי").
 * Used both for frontal signing (מסך 1) and remote signing (מסך 3).
 */
export default function SignaturePad({ onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pad = new SignaturePadLib(canvas, {
      backgroundColor: "rgb(255,255,255)",
      penColor: "rgb(19,33,28)",
    });
    padRef.current = pad;

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return; // hidden — skip
      // Preserve any existing strokes so the signature survives a resize
      // (mobile keyboard opening for the name field, or screen rotation).
      const data = pad.toData();
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);
      pad.clear(); // changing canvas size wipes the bitmap; reset internal state
      if (data.length) {
        pad.fromData(data);
        onChangeRef.current(pad.isEmpty() ? null : pad.toDataURL("image/png"));
      }
    }

    const handleEnd = () =>
      onChangeRef.current(pad.isEmpty() ? null : pad.toDataURL("image/png"));

    pad.addEventListener("endStroke", handleEnd);
    window.addEventListener("resize", resize);
    resize();

    return () => {
      pad.removeEventListener("endStroke", handleEnd);
      window.removeEventListener("resize", resize);
    };
  }, []);

  function clear() {
    padRef.current?.clear();
    onChangeRef.current(null);
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        className="h-44 w-full touch-none rounded-lg border border-rule bg-white"
      />
      <button
        type="button"
        onClick={clear}
        className="text-sm text-ink-soft hover:text-ink"
      >
        נקה חתימה
      </button>
    </div>
  );
}
