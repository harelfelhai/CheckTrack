"use client";

/**
 * Client-side image downscaling for captured cheque photos. Large phone photos
 * are shrunk in the browser BEFORE we send them to OCR / archive them — so the
 * user is never blocked by a size cap; the worst case is a transparent, lossy
 * resize with a notice. Only acts when the image is actually large (otherwise it
 * returns the original untouched, to avoid needless quality loss).
 */

/** ~4.5 MB decoded — comfortably fits a high-quality cheque scan; only genuinely
 *  large images get compressed. */
const DEFAULT_MAX_BYTES = 4.5 * 1024 * 1024;
const DEFAULT_MAX_DIM = 2600; // px on the longest side — keeps text crisp for OCR
const DEFAULT_QUALITY = 0.85;

/** Approximate decoded byte size of a base64 data URL. */
function approxBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
  return Math.floor(b64.length * 0.75);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("טעינת התמונה נכשלה"));
    img.src = src;
  });
}

function toJpeg(img: HTMLImageElement, scale: number, quality: number): string {
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return img.src;
  ctx.fillStyle = "#ffffff"; // flatten any transparency (cheques are on white)
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

export interface CompressResult {
  dataUrl: string;
  compressed: boolean;
}

/**
 * Returns the image unchanged when it's already within limits, otherwise a
 * downscaled/re-encoded JPEG that fits `maxBytes`. Never throws on a normal
 * image; on any failure it returns the original so the flow continues.
 */
export async function compressImageDataUrl(
  dataUrl: string,
  opts: { maxBytes?: number; maxDim?: number; quality?: number } = {},
): Promise<CompressResult> {
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxDim = opts.maxDim ?? DEFAULT_MAX_DIM;
  let quality = opts.quality ?? DEFAULT_QUALITY;

  if (typeof document === "undefined" || !dataUrl.startsWith("data:image")) {
    return { dataUrl, compressed: false };
  }

  try {
    const img = await loadImage(dataUrl);
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    // Within both limits → leave it exactly as-is (no re-encode, no quality loss).
    if (approxBytes(dataUrl) <= maxBytes && longest <= maxDim) {
      return { dataUrl, compressed: false };
    }

    let scale = Math.min(1, maxDim / longest);
    for (let i = 0; i < 6; i++) {
      const out = toJpeg(img, scale, quality);
      if (approxBytes(out) <= maxBytes || (quality <= 0.5 && scale <= 0.45)) {
        return { dataUrl: out, compressed: true };
      }
      // First spend quality, then dimensions, until it fits.
      if (quality > 0.5) quality -= 0.12;
      else scale *= 0.8;
    }
    return { dataUrl: toJpeg(img, scale, quality), compressed: true };
  } catch {
    return { dataUrl, compressed: false };
  }
}
