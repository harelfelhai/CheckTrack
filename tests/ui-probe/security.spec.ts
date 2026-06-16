import { test, expect, type APIRequestContext } from "@playwright/test";

// Security + validation regressions surfaced by the 2026-06-16 adversarial probe.

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

/** Create a not-delivered check and return its signing token. */
async function shareToken(request: APIRequestContext) {
  const num = "SEC-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  await request.post("/api/checks", {
    data: { checkNumber: num, recipientName: "ספק", writtenDate: "2026-09-02", amount: 1500 },
  });
  const share = await request.post(`/api/share/${num}`);
  const { url } = await share.json();
  const token = new URL(url).pathname.split("/sign/")[1];
  return { num, token };
}

test.describe("Security — signing tokens", () => {
  test("a tampered JWT signature is rejected", async ({ page, request }) => {
    const { token } = await shareToken(request);
    const tampered = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    await page.goto(`/sign/${tampered}`);
    await expect(page.getByText("הקישור אינו תקין")).toBeVisible();
  });

  // Defense in depth: the one-time lock must hold on a direct API call that
  // bypasses the UI, not just on the page.
  test("a used token is rejected on a direct API call (server-enforced)", async ({ request }) => {
    const { token } = await shareToken(request);
    const first = await request.post(`/api/sign/${token}`, {
      data: { signerName: "חותם ראשון", signatureDataUrl: TINY_PNG },
    });
    expect(first.ok()).toBeTruthy();
    const second = await request.post(`/api/sign/${token}`, {
      data: { signerName: "תוקף", signatureDataUrl: TINY_PNG },
    });
    expect(second.status()).toBe(409);
  });
});

test.describe("Validation — capture amount/name", () => {
  test("zero amount is rejected", async ({ page }) => {
    await page.goto("/capture");
    await page.getByRole("textbox", { name: "שם החברה / המקבל" }).fill("ספק");
    await page.getByRole("textbox", { name: "מספר צ'ק" }).fill("ZERO-" + Date.now());
    await page.getByRole("textbox", { name: "סכום הצ'ק (₪)" }).fill("0");
    await page.getByRole("textbox", { name: "תאריך כתיבה" }).fill("2026-08-08");
    await page.getByRole("button", { name: "שמור כלא נמסר" }).click();
    await expect(page.getByText("סכום הצ'ק לא תקין")).toBeVisible();
  });

  test("whitespace-only recipient name is rejected", async ({ page }) => {
    await page.goto("/capture");
    await page.getByRole("textbox", { name: "שם החברה / המקבל" }).fill("   ");
    await page.getByRole("textbox", { name: "מספר צ'ק" }).fill("WS-" + Date.now());
    await page.getByRole("textbox", { name: "סכום הצ'ק (₪)" }).fill("100");
    await page.getByRole("textbox", { name: "תאריך כתיבה" }).fill("2026-08-08");
    await page.getByRole("button", { name: "שמור כלא נמסר" }).click();
    await expect(page.getByText("שם המקבל חסר")).toBeVisible();
  });
});
