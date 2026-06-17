// One-off calibration script: run the Gemini check-extraction prompt against a
// local sample image and print the structured result. Not shipped.
//   node scripts/test-gemini-ocr.mjs [path-to-image]
import fs from "node:fs";

const env = fs.readFileSync(".env.local", "utf8");
const key = (env.split(/\r?\n/).find((l) => l.startsWith("GEMINI_API_KEY=")) || "")
  .slice("GEMINI_API_KEY=".length)
  .trim();
if (!key) {
  console.error("GEMINI_API_KEY missing in .env.local");
  process.exit(1);
}

const imgPath = process.argv[2] || "sample-check.png";
const mime = imgPath.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
const data = fs.readFileSync(imgPath).toString("base64");

const prompt = `You extract structured data from a photo of an Israeli bank cheque (שיק ישראלי). Return ONLY JSON matching the schema. Use null for any field you cannot read confidently.

Field rules (based on the Bank of Israel uniform-cheque layout):
- checkNumber: the cheque's own SERIAL number. It is printed in a corner and also appears as the FIRST (leftmost) group of the magnetic codeline at the very bottom. It is NOT the account number and NOT the branch number (those are the later groups of the bottom line). Typically 6-9 digits. Digits only.
- amount: the payment amount in NUMERALS (the digits inside the amount box, usually next to ₪). Return a plain number, no commas, no currency symbol. If the numeric amount and the amount-in-words disagree, prefer the amount in words.
- amountInWords: the amount written in Hebrew words (the "שלמו ל..." / sum-in-words line), as text.
- writtenDate: the cheque date written/printed in the date field (near the word "תאריך"). Israeli dates are day/month/year. Convert to ISO format YYYY-MM-DD. IGNORE the tiny cheque-book printing date in the margins and any stamp dates on the cheque.
- payeeName: the payee, i.e. the name after "לפקודת" / "שלמו ל".`;

const schema = {
  type: "OBJECT",
  properties: {
    checkNumber: { type: "STRING", nullable: true },
    amount: { type: "NUMBER", nullable: true },
    amountInWords: { type: "STRING", nullable: true },
    writtenDate: { type: "STRING", nullable: true },
    payeeName: { type: "STRING", nullable: true },
  },
  required: ["checkNumber", "amount", "writtenDate"],
};

const body = {
  contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mime, data } }] }],
  generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0 },
};

const r = await fetch(
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
  {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  },
);
const j = await r.json();
if (!r.ok) {
  console.error("ERR", r.status, JSON.stringify(j, null, 2));
  process.exit(1);
}
console.log("EXTRACTED:", j.candidates?.[0]?.content?.parts?.[0]?.text);
console.log("USAGE:", JSON.stringify(j.usageMetadata));
