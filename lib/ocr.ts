/**
 * OCR for captured cheque images (spec §5.ב). Extracts check number / amount /
 * date as a *draft* — every field stays editable by the user before saving
 * (the spec's core principle).
 *
 * Two backends, preferred in order:
 *   1. Gemini (multimodal) — reads the cheque image and returns structured
 *      fields using knowledge of the Israeli uniform-cheque layout. Much more
 *      accurate than text+regex (e.g. takes the cheque serial from the MICR
 *      codeline, not the account number).
 *   2. Google Cloud Vision (DOCUMENT_TEXT_DETECTION) + heuristic parsing — the
 *      legacy fallback when only a Vision key is configured.
 *
 * Cost-gated: with neither key set the service is "disabled" and returns an
 * empty result (no network call, no cost) so the app still runs.
 */

export interface OcrResult {
  enabled: boolean;
  checkNumber: string | null;
  amount: string | null;
  /** ISO date (YYYY-MM-DD) when parseable. */
  writtenDate: string | null;
  rawText: string;
}

export function isGeminiOcrEnabled(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export function isVisionOcrEnabled(): boolean {
  return !!process.env.GOOGLE_VISION_API_KEY;
}

export function isOcrEnabled(): boolean {
  return isGeminiOcrEnabled() || isVisionOcrEnabled();
}

const EMPTY = (enabled: boolean): OcrResult => ({
  enabled,
  checkNumber: null,
  amount: null,
  writtenDate: null,
  rawText: "",
});

export async function runOcr(imageDataUrl: string): Promise<OcrResult> {
  if (isGeminiOcrEnabled()) return runGeminiOcr(imageDataUrl);
  if (isVisionOcrEnabled()) return runVisionOcr(imageDataUrl);
  return EMPTY(false);
}

/* ── Gemini backend ──────────────────────────────────────────────────────── */

const GEMINI_MODEL = "gemini-2.5-flash";

const GEMINI_PROMPT = `You extract structured data from a photo of an Israeli bank cheque (שיק ישראלי). Return ONLY JSON matching the schema. Use null for any field you cannot read confidently.

Field rules (based on the Bank of Israel uniform-cheque layout):
- checkNumber: the cheque's own SERIAL number. It is printed in a corner and also appears as the FIRST (leftmost) group of the magnetic codeline at the very bottom. It is NOT the account number and NOT the branch number (those are the later groups of the bottom line). Typically 6-9 digits. Digits only.
- amount: the payment amount in NUMERALS (the digits inside the amount box, usually next to ₪). Return a plain number, no commas, no currency symbol. If the numeric amount and the amount-in-words disagree, prefer the amount in words.
- writtenDate: the cheque date written/printed in the date field (near the word "תאריך"). Israeli dates are day/month/year. Convert to ISO format YYYY-MM-DD. IGNORE the tiny cheque-book printing date in the margins and any stamp dates on the cheque.`;

const GEMINI_SCHEMA = {
  type: "OBJECT",
  properties: {
    checkNumber: { type: "STRING", nullable: true },
    amount: { type: "NUMBER", nullable: true },
    writtenDate: { type: "STRING", nullable: true },
  },
  required: ["checkNumber", "amount", "writtenDate"],
};

async function runGeminiOcr(imageDataUrl: string): Promise<OcrResult> {
  const m = imageDataUrl.match(/^data:(image\/\w+);base64,(.*)$/s);
  if (!m) throw new Error("התמונה אינה תקינה לחילוץ");
  const [, mime, data] = m;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: GEMINI_PROMPT }, { inline_data: { mime_type: mime, data } }] },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: GEMINI_SCHEMA,
          temperature: 0,
        },
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`חילוץ ה-OCR נכשל (${res.status})`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  let parsed: { checkNumber?: unknown; amount?: unknown; writtenDate?: unknown } = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    // Leave fields null — the user fills them in manually.
  }

  return {
    enabled: true,
    checkNumber: normalizeCheckNumber(parsed.checkNumber),
    amount: normalizeAmount(parsed.amount),
    writtenDate: normalizeDate(parsed.writtenDate),
    rawText: text,
  };
}

/** Digits only; null when empty. */
function normalizeCheckNumber(v: unknown): string | null {
  if (v == null) return null;
  const digits = String(v).replace(/\D/g, "");
  return digits.length ? digits : null;
}

/** Positive number → canonical string; null otherwise. */
function normalizeAmount(v: unknown): string | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? String(n) : null;
}

/** Accept a valid ISO YYYY-MM-DD only. */
function normalizeDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const dt = new Date(`${y}-${mo}-${d}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return null;
  // Round-trip guards against impossible dates like 2026-02-31.
  if (dt.getUTCMonth() + 1 !== Number(mo) || dt.getUTCDate() !== Number(d)) return null;
  return `${y}-${mo}-${d}`;
}

/* ── Google Vision backend (legacy fallback) ─────────────────────────────── */

async function runVisionOcr(imageDataUrl: string): Promise<OcrResult> {
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
