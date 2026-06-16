/**
 * OCR via Google Cloud Vision (spec §5.ב). Extracts check number / amount /
 * date from a captured image as a *draft* — every field stays editable by the
 * user before saving (the spec's core principle).
 *
 * Cost-gated: with no GOOGLE_VISION_API_KEY the service is "disabled" and
 * returns an empty result (no network call, no cost) so the app still runs.
 */

export interface OcrResult {
  enabled: boolean;
  checkNumber: string | null;
  amount: string | null;
  /** ISO date (YYYY-MM-DD) when parseable. */
  writtenDate: string | null;
  rawText: string;
}

export function isOcrEnabled(): boolean {
  return !!process.env.GOOGLE_VISION_API_KEY;
}

const EMPTY = (enabled: boolean): OcrResult => ({
  enabled,
  checkNumber: null,
  amount: null,
  writtenDate: null,
  rawText: "",
});

export async function runOcr(imageDataUrl: string): Promise<OcrResult> {
  if (!isOcrEnabled()) return EMPTY(false);

  const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64 },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
            imageContext: { languageHints: ["he", "en"] },
          },
        ],
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`חילוץ ה-OCR נכשל (${res.status})`);
  }

  const data = (await res.json()) as {
    responses?: { fullTextAnnotation?: { text?: string }; error?: { message?: string } }[];
  };
  const first = data.responses?.[0];
  if (first?.error?.message) throw new Error(`Vision: ${first.error.message}`);

  const text = first?.fullTextAnnotation?.text ?? "";
  return { enabled: true, ...parseCheckFields(text), rawText: text };
}

/**
 * Best-effort field extraction from raw OCR text. Heuristic by design — the
 * user reviews and corrects every value, so we prefer "leave blank" over a
 * confident wrong guess.
 */
export function parseCheckFields(text: string): Omit<OcrResult, "enabled" | "rawText"> {
  return {
    checkNumber: parseCheckNumber(text),
    amount: parseAmount(text),
    writtenDate: parseDate(text),
  };
}

function parseAmount(text: string): string | null {
  // Amounts usually carry a thousands separator or agorot, e.g. 5,400 / 950.00
  const matches = [...text.matchAll(/\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+\.\d{2}/g)].map(
    (m) => Number(m[0].replace(/,/g, "")),
  );
  if (!matches.length) return null;
  const max = Math.max(...matches);
  return Number.isFinite(max) && max > 0 ? String(max) : null;
}

function parseDate(text: string): string | null {
  const m = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/);
  if (!m) return null;
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
  if (Number(mm) > 12 || Number(dd) > 31) return null;
  return `${yyyy}-${mm}-${dd}`;
}

function parseCheckNumber(text: string): string | null {
  // The MICR band / check number is the longest standalone digit run (>= 5).
  const runs = [...text.matchAll(/\d{5,}/g)].map((m) => m[0]);
  if (!runs.length) return null;
  return runs.sort((a, b) => b.length - a.length)[0];
}
