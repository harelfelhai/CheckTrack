/**
 * One-image pre-flight for Cloud Vision: confirms the API key is valid and the
 * Vision API is enabled on the project. Sends a single tiny image (1 unit —
 * within the free 1000/month tier, cost ≈ $0). Surfaces clear errors.
 *   npm run vision:sample
 */
const KEY = process.env.GOOGLE_VISION_API_KEY;
if (!KEY) {
  console.error("✗ חסר GOOGLE_VISION_API_KEY ב-.env.local");
  process.exit(1);
}

// 1x1 white PNG (no text expected — this only validates connectivity).
const TINY_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

console.log("שולח תמונת בדיקה ל-Cloud Vision...\n");
const res = await fetch(
  `https://vision.googleapis.com/v1/images:annotate?key=${KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: TINY_PNG },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          imageContext: { languageHints: ["he", "en"] },
        },
      ],
    }),
  },
);

const data = await res.json();

if (!res.ok) {
  console.error(`✗ ה-API החזיר שגיאה (${res.status}):`);
  console.error("  " + (data?.error?.message || JSON.stringify(data)));
  if (data?.error?.status === "PERMISSION_DENIED") {
    console.error("\n→ כנראה Cloud Vision API לא מופעל בפרויקט. הפעל אותו ב-Library ונסה שוב.");
  }
  process.exit(1);
}

const first = data.responses?.[0];
if (first?.error?.message) {
  console.error("✗ Vision החזיר שגיאה לבקשה:", first.error.message);
  process.exit(1);
}

console.log("✓ המפתח תקין ו-Cloud Vision API מופעל ומגיב.");
console.log("  (התמונה ריקה מטקסט — זו רק בדיקת חיבור; חילוץ אמיתי ייבדק על תמונת צ'ק ב-UI.)");
